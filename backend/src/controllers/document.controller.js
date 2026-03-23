// src/controllers/document.controller.js
import path from 'path';
import fs from 'fs';
import { STORAGE_TYPE } from '../config/storage.config.js';
import db from '../models/index.js';
import dotenv from 'dotenv';
import documentLogger from '../utils/logger/individualLogger/documentLogger.js';
import {
    S3Client,
    DeleteObjectCommand,
    GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Op } from "sequelize";
~
    dotenv.config();

const Document = db.Document;
const Batch = db.Batch;
const BatchStudent = db.BatchStudent;
const BatchDocument = db.BatchDocument;

// Initialize S3 client once
let s3 = null;
if (process.env.STORAGE_TYPE === 'aws') {
    s3 = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY,
            secretAccessKey: process.env.AWS_SECRET_KEY,
        },
    });
}

// -------------------------------------------------------------------
// Upload Document
// -------------------------------------------------------------------
export const uploadDocument = async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            documentLogger.warn('Upload Document - No file uploaded');
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const filePath = file.location || file.path;
        const fileType = path.extname(file.originalname).replace('.', '');

        const { title, description, language, visibility, batch_ids, topic_id } = req.body;

        const doc = await Document.create({
            title: title || file.originalname,
            description: description || null,
            file_path: filePath,
            file_type: fileType,
            language: language || null,
            uploaded_by: req.user?.user?.id,
            visibility: visibility || 'batch',
            topic_id: topic_id || null,
            is_active: true,
        });

        // Assign to batches if provided
        if (batch_ids && Array.isArray(batch_ids)) {
            await doc.setBatches(batch_ids);
        }

        documentLogger.info(`Document uploaded successfully - Document ID: ${doc.id}, File: ${file.originalname}`);
        return res.status(201).json({ message: 'Uploaded', document: doc });
    } catch (err) {
        documentLogger.error(`Error in uploadDocument: ${err.message}`);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// -------------------------------------------------------------------
// List Documents
// -------------------------------------------------------------------
export const listDocuments = async (req, res) => {
    try {
        const role = req.user?.role || req.user?.user?.role;
        const userId = req.user?.id || req.user?.user?.id;
        const filters = {};

        // query filters
        if (req.query.language) filters.language = req.query.language;
        if (req.query.visibility) filters.visibility = req.query.visibility;
        if (req.query.search) {
            filters.title = { [Op.like]: `%${req.query.search}%` };
        }

        if (role === 'admin') {
            const { page = 1, limit = 10 } = req.query;
            const offset = (page - 1) * limit;

            const { count, rows } = await Document.findAndCountAll({
                where: filters,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['created_at', 'DESC']]
            });

            documentLogger.info(`Documents listed by admin - Count: ${rows.length}`);
            return res.json({
                documents: rows,
                total: count,
                totalPages: Math.ceil(count / limit),
                currentPage: parseInt(page)
            });
        }

        // Gather batch ids accessible to user (strict ongoing)
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
            documentLogger.info(`Documents listed by ${role} - No accessible ongoing batches`);
            return res.json({ documents: [], total: 0, totalPages: 0, currentPage: parseInt(req.query.page || 1) });
        }

        // If batch_id filter provided, narrow to that specific batch (must be in accessible list)
        let batchIdsToQuery = accessibleBatchIds;
        if (req.query.batch_id && accessibleBatchIds.includes(req.query.batch_id)) {
            batchIdsToQuery = [req.query.batch_id];
        }

        // Find document ids linked to these batches
        const bdRows = await BatchDocument.findAll({
            where: { batch_id: { [Op.in]: batchIdsToQuery } },
            attributes: ['document_id'],
            raw: true,
        });

        const docIds = [...new Set(bdRows.map(r => r.document_id))];
        if (docIds.length === 0) {
            documentLogger.info(`Documents listed by ${role} - No documents found in ongoing batches`);
            return res.json({ documents: [], total: 0, totalPages: 0, currentPage: parseInt(req.query.page || 1) });
        }

        const where = { ...filters, id: { [Op.in]: docIds } };
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const { count, rows } = await Document.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']],
        });

        documentLogger.info(`Documents listed by ${role} - Count: ${rows.length}`);
        res.json({
            documents: rows,
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
        });
    } catch (err) {
        documentLogger.error(`Error in listDocuments: ${err.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};


// -------------------------------------------------------------------
// Get Document
// -------------------------------------------------------------------
export const getDocument = async (req, res) => {
    try {
        const role = req.user?.role;
        const userId = req.user?.id;

        const doc = await Document.findByPk(req.params.id, {
            include: [{ model: Batch, as: 'batches', through: { attributes: [] } }]
        });

        if (!doc) {
            documentLogger.warn(`Get Document - Document not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Document not found' });
        }

        if (role === 'admin') {
            documentLogger.info(`Document retrieved by admin - Document ID: ${doc.id}`);
            return res.json(doc);
        }

        // Get accessible ONGOING batch ids
        const docBatchIds = (doc.batches || [])
            .filter(b => b.status === 'ongoing')
            .map(b => b.id);

        if (role === 'instructor') {
            const owns = await Batch.count({
                where: { id: { [Op.in]: docBatchIds }, instructor_id: userId }
            });
            if (owns === 0) {
                documentLogger.warn(`Get Document - Access denied for instructor: ${userId}, Document: ${doc.id}`);
                return res.status(403).json({ message: 'Access denied' });
            }
            documentLogger.info(`Document retrieved by instructor - Document ID: ${doc.id}`);
            return res.json(doc);
        }

        if (role === 'student') {
            const enrolled = await BatchStudent.findOne({
                where: {
                    student_id: userId,
                    batch_id: { [Op.in]: docBatchIds },
                },
            });
            if (!enrolled) {
                documentLogger.warn(`Get Document - Access denied for student: ${userId}, Document: ${doc.id}`);
                return res.status(403).json({ message: 'Access denied' });
            }
            documentLogger.info(`Document retrieved by student - Document ID: ${doc.id}`);
            return res.json(doc);
        }

        documentLogger.warn(`Get Document - Access denied for unknown role: ${role}`);
        res.status(403).json({ message: 'Access denied' });
    } catch (err) {
        documentLogger.error(`Error in getDocument: ${err.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};


// -------------------------------------------------------------------
// Download Document (with signed URL support)
// -------------------------------------------------------------------
export const downloadDocument = async (req, res) => {
    try {
        const doc = await Document.findByPk(req.params.id);
        if (!doc) {
            documentLogger.warn(`Download Document - Document not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Not found' });
        }

        const inline = req.query.inline === 'true';

        if (process.env.STORAGE_TYPE === 'aws' && s3) {
            if (!process.env.AWS_BUCKET_NAME) {
                documentLogger.error('Download Document - S3 not configured');
                return res.status(500).json({ message: 'S3 not configured' });
            }

            // Public URL
            if (doc.file_path && doc.file_path.startsWith('http')) {
                documentLogger.info(`Document downloaded from S3 - Document ID: ${doc.id}`);
                if (inline) return res.redirect(doc.file_path);
                res.setHeader(
                    'Content-Disposition',
                    `attachment; filename="${doc.title || 'file'}"`
                );
                return res.redirect(doc.file_path);
            }

            // Generate signed URL (v3)
            const Key = doc.file_path.replace(/^https?:\/\/.*?\/?/, '');
            const command = new GetObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key,
                ResponseContentDisposition: inline
                    ? 'inline'
                    : `attachment; filename="${doc.title}"`,
            });

            const signedUrl = await getSignedUrl(s3, command, {
                expiresIn: Number(process.env.SIGNED_URL_EXPIRES || 60),
            });

            documentLogger.info(`Signed URL generated - Document ID: ${doc.id}`);
            return res.redirect(signedUrl);
        } else {
            // Local file handling
            const absolutePath = path.isAbsolute(doc.file_path)
                ? doc.file_path
                : path.join(process.cwd(), doc.file_path);

            if (!fs.existsSync(absolutePath)) {
                documentLogger.warn(`Download Document - File not found on server: ${absolutePath}`);
                return res.status(404).json({ message: 'File not found on server' });
            }

            const filename = doc.title || path.basename(absolutePath);
            const disposition = inline
                ? 'inline'
                : `attachment; filename="${filename}"`;

            documentLogger.info(`Local document downloaded - Document ID: ${doc.id}`);
            res.setHeader('Content-Disposition', disposition);
            return res.sendFile(absolutePath);
        }
    } catch (err) {
        documentLogger.error(`Error in downloadDocument: ${err.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// -------------------------------------------------------------------
// assignBatches - assign a document to multiple batches (replace associations)
// Body: { batch_ids: ["uuid1","uuid2"] }
// -------------------------------------------------------------------
export const assignBatches = async (req, res) => {
    try {
        const userId = req.user?.user?.id;
        const role = req.user?.user?.role;
        const docId = req.params.id;
        const { batch_ids } = req.body;

        if (!Array.isArray(batch_ids) || batch_ids.length === 0) {
            documentLogger.warn('Assign Batches - batch_ids must be a non-empty array');
            return res.status(400).json({ message: 'batch_ids must be a non-empty array' });
        }

        const doc = await Document.findByPk(docId);
        if (!doc) {
            documentLogger.warn(`Assign Batches - Document not found: ${docId}`);
            return res.status(404).json({ message: 'Document not found' });
        }

        // Permission: admin OR instructor owning any of the target batches
        if (role === 'instructor') {
            const owned = await Batch.count({ where: { id: { [Op.in]: batch_ids }, instructor_id: userId } });
            if (owned !== batch_ids.length) {
                documentLogger.warn(`Assign Batches - Forbidden for instructor: ${userId}, Document: ${docId}`);
                return res.status(403).json({ message: 'Forbidden: you can only assign documents to your own batches' });
            }
        } else if (role !== 'admin') {
            documentLogger.warn(`Assign Batches - Forbidden for role: ${role}`);
            return res.status(403).json({ message: 'Forbidden' });
        }

        // set associations (overwrite)
        await doc.setBatches(batch_ids);

        const updated = await Document.findByPk(docId, { include: [{ model: Batch, as: 'batches' }] });
        documentLogger.info(`Document assigned to batches - Document ID: ${docId}, Batch Count: ${batch_ids.length}`);
        return res.json({ message: 'Assigned to batches', document: updated });
    } catch (err) {
        documentLogger.error(`Error in assignBatches: ${err.message}`);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// -------------------------------------------------------------------
// Delete Document
// -------------------------------------------------------------------
export const deleteDocument = async (req, res) => {
    try {
        const doc = await Document.findByPk(req.params.id);
        if (!doc) {
            documentLogger.warn(`Delete Document - Document not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Document not found' });
        }

        if (process.env.STORAGE_TYPE !== 'aws') {
            // Local deletion
            const absolutePath = path.isAbsolute(doc.file_path)
                ? doc.file_path
                : path.join(process.cwd(), doc.file_path);
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
            }
        } else if (s3) {
            // Delete from S3
            const Key = doc.file_path.replace(/^https?:\/\/.*?\/?/, '');
            const command = new DeleteObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key,
            });
            try {
                await s3.send(command);
            } catch (e) {
                documentLogger.warn(`S3 delete warning: ${e.message || e}`);
            }
        }

        await doc.destroy();
        documentLogger.info(`Document deleted successfully - Document ID: ${doc.id}`);
        res.json({ message: 'Document deleted' });
    } catch (err) {
        documentLogger.error(`Error in deleteDocument: ${err.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// -------------------------------------------------------------------
// Get Lanugaes of Document
// -------------------------------------------------------------------
export const getUniqueLanguages = async (req, res) => {
    try {
        const languages = await Document.findAll({
            attributes: [
                [Document.sequelize.fn("DISTINCT", Document.sequelize.col("language")), "language"],
            ],
            where: {
                language: {
                    [Op.ne]: null,
                },
            },
            raw: true,
        });

        const uniqueLanguages = languages
            .map(l => l.language)
            .filter(Boolean)
            .sort();

        documentLogger.info(`Unique languages retrieved - Count: ${uniqueLanguages.length}`);
        res.status(200).json({
            success: true,
            count: uniqueLanguages.length,
            languages: uniqueLanguages,
        });
    } catch (error) {
        documentLogger.error(`Error in getUniqueLanguages: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Server error while fetching unique languages",
            error: error.message,
        });
    }
};
