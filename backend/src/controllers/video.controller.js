// src/controllers/video.controller.js
import Mux from '@mux/mux-node';
import db from '../models/index.js';
import dotenv from 'dotenv';
import { Op } from 'sequelize';
import videoLogger from '../utils/logger/individualLogger/videoLogger.js';
dotenv.config();

const Video = db.Video;
const Batch = db.Batch;
const BatchStudent = db.BatchStudent;
const BatchVideo = db.BatchVideo;

const mux = new Mux({
    accessToken: process.env.MUX_TOKEN_ID,
    secret: process.env.MUX_TOKEN_SECRET,
});

// Helper: ensure user present
const ensureUser = (req) => {
    if (!req.user) throw new Error('Unauthenticated (req.user missing)');
    return req.user;
};

// -------------------------------------------------------------------
// createDirectUpload - create a Mux Direct Upload, return upload URL + ids
// -------------------------------------------------------------------
export const createDirectUpload = async (req, res) => {
    try {
        const user = ensureUser(req);
        if (!['instructor', 'admin'].includes(user.user.role)) {
            videoLogger.warn(`Create Direct Upload - Forbidden for role: ${user.user.role}`);
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { title, description, language, visibility, topic_id, batch_ids } = req.body;

        // Create DB placeholder for the video
        const entry = await Video.create({
            title: title || 'Untitled',
            description: description || null,
            language: language || null,
            uploaded_by: user.user.id,
            visibility: visibility || 'batch',
            topic_id: topic_id || null,
            upload_status: 'pending',
        });

        // If batch_ids provided, associate them
        if (Array.isArray(batch_ids) && batch_ids.length > 0) {
            await entry.setBatches(batch_ids);
        }

        // Create a direct upload on Mux; passthrough ties the upload back to our entry id
        const upload = await mux.video.uploads.create({
            new_asset_settings: {
                passthrough: entry.id,
                playback_policy: ['public'], // or ['signed'] if you want restricted playback
            },
            cors_origin: process.env.MUX_UPLOAD_CORS_ORIGIN || '*',
        });

        // store upload id
        entry.mux_upload_id = upload.id;
        await entry.save();

        videoLogger.info(`Direct upload created - Video ID: ${entry.id}, Upload ID: ${upload.id}`);
        return res.status(201).json({
            id: entry.id,
            upload_id: upload.id,
            upload_url: upload.url,
        });
    } catch (err) {
        videoLogger.error(`Error in createDirectUpload: ${err.message}`);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// -------------------------------------------------------------------
// muxWebhookHandler - verify signature & process webhook events
// Note: route must use express.raw(...) so raw body is available.
// -------------------------------------------------------------------
export const muxWebhookHandler = async (req, res) => {
    try {
        // req.body is raw Buffer when using express.raw for this route
        const rawBody = req.body;
        const signatureHeader = req.headers['mux-signature'] || req.headers['Mux-Signature'] || req.headers['mux_signature'];

        // Use SDK verify helper if available
        // Mux SDK provides webhooks.unwrap in some versions; if not, perform manual HMAC verification.
        let event;
        try {
            if (typeof mux.webhooks?.verify === 'function') {
                // newer SDK may use mux.webhooks.verify(rawBody, signatureHeader, webhookSecret)
                event = mux.webhooks.verify(rawBody.toString(), signatureHeader, process.env.MUX_WEBHOOK_SECRET);
            } else if (typeof mux.webhooks?.unwrap === 'function') {
                event = mux.webhooks.unwrap(rawBody.toString(), req.headers, process.env.MUX_WEBHOOK_SECRET);
            } else {
                // fallback: attempt to parse JSON (no verification) — not recommended for prod
                event = JSON.parse(rawBody.toString());
                videoLogger.warn('Mux webhook verification not performed (SDK method missing)');
            }
        } catch (e) {
            videoLogger.warn(`Mux webhook signature verification failed: ${e.message}`);
            return res.status(400).json({ message: 'Invalid webhook signature' });
        }

        const { type, data } = event;
        // For direct uploads we set passthrough to our Video.id
        const passthrough = data?.passthrough || data?.asset?.passthrough || null;
        const asset = data?.asset || data;

        switch (type) {
            case 'video.upload.asset_created':
            case 'video.asset.created': {
                // asset created: update mux_asset_id (if available)
                const assetId = asset?.id || null;
                if (passthrough) {
                    await Video.update({
                        mux_asset_id: assetId,
                        upload_status: 'pending',
                    }, { where: { id: passthrough } });
                    videoLogger.info(`Asset created - Video ID: ${passthrough}, Asset ID: ${assetId}`);
                } else if (assetId) {
                    await Video.update({ mux_asset_id: assetId, upload_status: 'pending' }, { where: { mux_asset_id: assetId } });
                }
                break;
            }

            case 'video.asset.ready': {
                const assetId = asset?.id;
                // playback_ids may be array; prefer first
                const playbackObj = Array.isArray(asset?.playback_ids) ? asset.playback_ids[0] : null;
                const playbackId = playbackObj?.id || asset?.playback_id || null;

                if (passthrough) {
                    await Video.update({
                        mux_asset_id: assetId,
                        mux_playback_id: playbackId,
                        upload_status: 'ready',
                    }, { where: { id: passthrough } });
                    videoLogger.info(`Asset ready - Video ID: ${passthrough}, Playback ID: ${playbackId}`);
                } else if (assetId) {
                    await Video.update({
                        mux_asset_id: assetId,
                        mux_playback_id: playbackId,
                        upload_status: 'ready',
                    }, { where: { mux_asset_id: assetId } });
                }
                break;
            }

            case 'video.upload.errored':
            case 'video.asset.errored': {
                if (passthrough) {
                    await Video.update({ upload_status: 'failed' }, { where: { id: passthrough } });
                    videoLogger.warn(`Asset error - Video ID: ${passthrough}`);
                } else {
                    const uploadId = data?.id || data?.upload_id;
                    if (uploadId) {
                        await Video.update({ upload_status: 'failed' }, { where: { mux_upload_id: uploadId } });
                        videoLogger.warn(`Asset error - Upload ID: ${uploadId}`);
                    }
                }
                break;
            }

            case 'video.upload.cancelled': {
                if (passthrough) {
                    await Video.update({ upload_status: 'cancelled' }, { where: { id: passthrough } });
                    videoLogger.info(`Upload cancelled - Video ID: ${passthrough}`);
                }
                break;
            }

            default:
                // ignore other events
                break;
        }

        return res.status(200).json({ received: true });
    } catch (err) {
        videoLogger.error(`Error in muxWebhookHandler: ${err.message}`);
        return res.status(500).json({ message: 'Server error' });
    }
};

// -------------------------------------------------------------------
// assignBatches - assign a video to multiple batches (replace associations)
// Body: { batch_ids: ["uuid1","uuid2"] }
// -------------------------------------------------------------------
export const assignBatches = async (req, res) => {
    try {
        const user = ensureUser(req);
        const videoId = req.params.id;
        const { batch_ids } = req.body;

        if (!Array.isArray(batch_ids) || batch_ids.length === 0) {
            videoLogger.warn('Assign Batches - batch_ids must be a non-empty array');
            return res.status(400).json({ message: 'batch_ids must be a non-empty array' });
        }

        const video = await Video.findByPk(videoId);
        if (!video) {
            videoLogger.warn(`Assign Batches - Video not found: ${videoId}`);
            return res.status(404).json({ message: 'Video not found' });
        }

        // Permission: admin OR instructor owning any of the target batches
        if (user.user.role === 'instructor') {
            // ensure the instructor owns all provided batches (or at least one? choose strict approach)
            const owned = await Batch.count({ where: { id: { [Op.in]: batch_ids }, instructor_id: user.user.id } });
            if (owned !== batch_ids.length) {
                videoLogger.warn(`Assign Batches - Forbidden for instructor: ${user.user.id}, Video: ${videoId}`);
                return res.status(403).json({ message: 'Forbidden: you can only assign videos to your own batches' });
            }
        } else if (user.user.role !== 'admin') {
            videoLogger.warn(`Assign Batches - Forbidden for role: ${user.user.role}`);
            return res.status(403).json({ message: 'Forbidden' });
        }

        // set associations (overwrite)
        await video.setBatches(batch_ids);

        const updated = await Video.findByPk(videoId, { include: [{ model: Batch, as: 'batches' }] });
        videoLogger.info(`Video assigned to batches - Video ID: ${videoId}, Batch Count: ${batch_ids.length}`);
        return res.json({ message: 'Assigned to batches', video: updated });
    } catch (err) {
        videoLogger.error(`Error in assignBatches: ${err.message}`);
        return res.status(500).json({ message: 'Server error' });
    }
};

// -------------------------------------------------------------------
// listVideos - role-aware, returns videos where the user has access
// -------------------------------------------------------------------
export const listVideos = async (req, res) => {
    try {
        const filters = {};
        const user = ensureUser(req);
        const role = user.user.role;
        const userId = user.user.id;

        // query filters
        if (req.query.language) filters.language = req.query.language;
        if (req.query.upload_status) filters.upload_status = req.query.upload_status;

        // For many-to-many, we'll fetch videos that are associated to relevant batches
        if (role === 'admin') {
            const { page = 1, limit = 10 } = req.query;
            const offset = (page - 1) * limit;

            const { count, rows } = await Video.findAndCountAll({
                where: filters,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['created_at', 'DESC']]
            });

            videoLogger.info(`Videos listed by admin - Count: ${rows.length}`);
            return res.json({
                videos: rows,
                total: count,
                totalPages: Math.ceil(count / limit),
                currentPage: parseInt(page)
            });
        }

        // gather batch ids accessible to user
        let accessibleBatchIds = [];

        if (role === 'instructor') {
            const instructorBatches = await Batch.findAll({
                where: { instructor_id: userId, status: 'ongoing' },
                attributes: ['id'],
                raw: true,
            });
            accessibleBatchIds = instructorBatches.map(b => b.id);
        } else if (role === 'student') {
            const enrolled = await BatchStudent.findAll({
                where: { student_id: userId },
                include: [{
                    model: Batch,
                    as: 'batch',
                    where: { status: 'ongoing' },
                    attributes: []
                }],
                attributes: ['batch_id'],
                raw: true,
            });
            accessibleBatchIds = enrolled.map(b => b.batch_id);
        }

        if (accessibleBatchIds.length === 0) {
            // no batches -> return empty
            videoLogger.info(`Videos listed by ${role} - No accessible batches`);
            return res.json({ videos: [], total: 0, totalPages: 0, currentPage: parseInt(req.query.page || 1) });
        }

        // Find video ids linked to these batches via BatchVideo
        const bvRows = await BatchVideo.findAll({
            where: { batch_id: { [Op.in]: accessibleBatchIds } },
            attributes: ['video_id'],
            raw: true,
        });

        const videoIds = [...new Set(bvRows.map(r => r.video_id))];
        if (videoIds.length === 0) {
            videoLogger.info(`Videos listed by ${role} - No videos found`);
            return res.json({ videos: [], total: 0, totalPages: 0, currentPage: parseInt(req.query.page || 1) });
        }

        // apply video-level filters and restrict to videoIds
        const where = { ...filters, id: { [Op.in]: videoIds } };
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const { count, rows } = await Video.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']]
        });

        videoLogger.info(`Videos listed by ${role} - Count: ${rows.length}`);
        return res.json({
            videos: rows,
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
        });
    } catch (err) {
        videoLogger.error(`Error in listVideos: ${err.message}`);
        return res.status(500).json({ message: 'Server error' });
    }
};

// -------------------------------------------------------------------
// getVideo - return metadata if user has access (checks via BatchVideo)
// -------------------------------------------------------------------
export const getVideo = async (req, res) => {
    try {
        const user = ensureUser(req);
        const role = user.user.role;
        const userId = user.user.id;

        const video = await Video.findByPk(req.params.id, { include: [{ model: Batch, as: 'batches', through: { attributes: [] } }] });
        if (!video) {
            videoLogger.warn(`Get Video - Video not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Not found' });
        }

        // Get the list of ONGOING batch ids associated with the video that the user has access to
        const videoBatchIds = (video.batches || [])
            .filter(b => b.status === 'ongoing')
            .map(b => b.id);

        if (role === 'admin') {
            videoLogger.info(`Video retrieved by admin - Video ID: ${req.params.id}`);
            return res.json(video);
        }

        if (role === 'instructor') {
            // ensure instructor owns at least one of the batches the video is assigned to
            const owns = await Batch.count({ where: { id: { [Op.in]: videoBatchIds }, instructor_id: userId } });
            if (owns === 0) {
                videoLogger.warn(`Get Video - Access denied for instructor: ${userId}, Video: ${req.params.id}`);
                return res.status(403).json({ message: 'Access denied' });
            }
            videoLogger.info(`Video retrieved by instructor - Video ID: ${req.params.id}`);
            return res.json(video);
        }

        if (role === 'student') {
            // check enrollment intersection
            const enrolled = await BatchStudent.findOne({
                where: {
                    student_id: userId,
                    batch_id: { [Op.in]: videoBatchIds },
                },
            });
            if (!enrolled) {
                videoLogger.warn(`Get Video - Access denied for student: ${userId}, Video: ${req.params.id}`);
                return res.status(403).json({ message: 'Access denied' });
            }
            videoLogger.info(`Video retrieved by student - Video ID: ${req.params.id}`);
            return res.json(video);
        }

        videoLogger.warn(`Get Video - Access denied for unknown role: ${role}`);
        return res.status(403).json({ message: 'Access denied' });
    } catch (err) {
        videoLogger.error(`Error in getVideo: ${err.message}`);
        return res.status(500).json({ message: 'Server error' });
    }
};

// -------------------------------------------------------------------
// getPlaybackUrl - returns playback url (public policy) or hint to client
// -------------------------------------------------------------------
export const getPlaybackUrl = async (req, res) => {
    try {
        const video = await Video.findByPk(req.params.id);
        if (!video || !video.mux_playback_id) {
            videoLogger.warn(`Get Playback - Playback not available for Video: ${req.params.id}`);
            return res.status(404).json({ message: 'Playback not available' });
        }

        // Use public playback. If you use signed playback, implement token signing here.
        const playbackUrl = `https://stream.mux.com/${video.mux_playback_id}.m3u8`;
        videoLogger.info(`Playback URL generated - Video ID: ${req.params.id}`);
        return res.json({ playback_url: playbackUrl, mux_playback_id: video.mux_playback_id });
    } catch (err) {
        videoLogger.error(`Error in getPlaybackUrl: ${err.message}`);
        return res.status(500).json({ message: 'Server error' });
    }
};

// -------------------------------------------------------------------
// deleteVideo - delete Mux asset and DB record; permissioned
// -------------------------------------------------------------------
export const deleteVideo = async (req, res) => {
    try {
        const user = ensureUser(req);
        const video = await Video.findByPk(req.params.id, { include: [{ model: Batch, as: 'batches', through: { attributes: [] } }] });
        if (!video) {
            videoLogger.warn(`Delete Video - Video not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Not found' });
        }

        // permission: admin OR instructor owning at least one assigned batch
        if (user.user.role === 'instructor') {
            const videoBatchIds = (video.batches || []).map(b => b.id);
            const owns = await Batch.count({ where: { id: { [Op.in]: videoBatchIds }, instructor_id: user.user.id } });
            if (owns === 0) {
                videoLogger.warn(`Delete Video - Forbidden for instructor: ${user.user.id}, Video: ${req.params.id}`);
                return res.status(403).json({ message: 'Forbidden' });
            }
        } else if (user.user.role !== 'admin') {
            videoLogger.warn(`Delete Video - Forbidden for role: ${user.user.role}`);
            return res.status(403).json({ message: 'Forbidden' });
        }

        // delete asset on Mux if present
        if (video.mux_asset_id) {
            try {
                await mux.video.assets.del(video.mux_asset_id);
            } catch (e) {
                videoLogger.warn(`Mux delete asset warning: ${e.message}`);
            }
        }

        // remove associations and delete record
        await video.setBatches([]); // cleanup pivot
        await video.destroy();

        videoLogger.info(`Video deleted successfully - Video ID: ${req.params.id}`);
        return res.json({ message: 'Deleted' });
    } catch (err) {
        videoLogger.error(`Error in deleteVideo: ${err.message}`);
        return res.status(500).json({ message: 'Server error' });
    }
};
