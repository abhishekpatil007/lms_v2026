import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import db from '../models/index.js';
import jwt from 'jsonwebtoken';
import { getZoomAccessToken } from '../services/zoomAuth.service.js';
import webinarLogger from '../utils/logger/individualLogger/webinarLogger.js';

const { Webinar, WebinarRegistration, User } = db;

/**
 * 🔹 Helper: Create Zoom Webinar
 */
const createZoomWebinar = async (topic, startTime, duration, description) => {
    const token = await getZoomAccessToken();

    const response = await axios.post(
        'https://api.zoom.us/v2/users/me/webinars',
        {
            topic,
            type: 5, // Scheduled webinar
            start_time: startTime, // ISO8601
            duration,
            agenda: description,
            settings: {
                approval_type: 2, // NO REGISTRATION REQUIRED
                registration_type: 0,
                host_video: true,
                panelists_video: true,
                practice_session: true,
                hd_video: true,
                mute_upon_entry: true,
                waiting_room: true
            }
        },
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    return response.data;
};

/**
 * 🎯 1. Create Webinar (Admin/Instructor)
 */
export const createWebinar = async (req, res) => {
    try {
        const { topic, description = 'NA', start_time, duration = 60 } = req.body;
        const instructor_id = req.user.user.role === 'instructor' ? req.user.user.id : null;

        const zoomWebinar = await createZoomWebinar(topic, start_time, duration, description);

        const webinar = await Webinar.create({
            instructor_id,
            topic,
            description,
            start_time,
            duration,
            zoom_webinar_id: zoomWebinar.id,
            zoom_join_url: zoomWebinar.join_url,
            zoom_start_url: zoomWebinar.start_url,
            status: 'scheduled'
        });

        webinarLogger.info(`Webinar created successfully - Webinar ID: ${webinar.id}, Topic: ${topic}`);
        return res.status(201).json({
            message: 'Webinar created successfully.',
            data: webinar
        });
    } catch (error) {
        webinarLogger.error(`Error in createWebinar: ${error.message}`);
        return res.status(500).json({
            message: 'Failed to create webinar',
            error: error.message
        });
    }
};

/**
 * 📅 2. Get All Webinars (Public)
 */
export const getAllWebinars = async (req, res) => {
    try {
        const webinars = await Webinar.findAll({
            include: [{ association: 'instructor', attributes: ['id', 'name', 'email'] }],
            order: [['start_time', 'ASC']]
        });

        webinarLogger.info(`All webinars retrieved - Count: ${webinars.length}`);
        return res.json({ message: 'Webinars fetched successfully.', data: webinars });
    } catch (error) {
        webinarLogger.error(`Error in getAllWebinars: ${error.message}`);
        return res.status(500).json({ message: 'Failed to fetch webinars', error: error.message });
    }
};

/**
 * 🔍 3. Get Webinar by ID
 */
export const getWebinarById = async (req, res) => {
    try {
        const { id } = req.params;

        const webinar = await Webinar.findByPk(id, {
            include: [
                { association: 'instructor', attributes: ['id', 'name', 'email'] }
            ]
        });

        if (!webinar) {
            webinarLogger.warn(`Get Webinar - Webinar not found: ${id}`);
            return res.status(404).json({ message: 'Webinar not found' });
        }

        webinarLogger.info(`Webinar retrieved - Webinar ID: ${id}`);
        return res.json({ message: 'Webinar fetched successfully.', data: webinar });
    } catch (error) {
        webinarLogger.error(`Error in getWebinarById: ${error.message}`);
        return res.status(500).json({ message: 'Failed to fetch webinar', error: error.message });
    }
};

/**
 * ✏️ 4. Update Webinar (Admin/Instructor)
 */
export const updateWebinar = async (req, res) => {
    try {
        const { id } = req.params;
        const { topic, start_time, duration, description } = req.body;

        const webinar = await Webinar.findByPk(id);
        if (!webinar) {
            webinarLogger.warn(`Update Webinar - Webinar not found: ${id}`);
            return res.status(404).json({ message: 'Webinar not found' });
        }

        // Permission check
        if (req.user.user.role !== 'admin' && webinar.instructor_id !== req.user.user.id) {
            webinarLogger.warn(`Update Webinar - Unauthorized for user: ${req.user.user.id}, Webinar: ${id}`);
            return res.status(403).json({ message: 'Unauthorized to edit this webinar' });
        }

        // Update on Zoom
        const token = await getZoomAccessToken();
        await axios.patch(
            `https://api.zoom.us/v2/webinars/${webinar.zoom_webinar_id}`,
            { topic, start_time, duration, agenda: description },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        // Update local DB
        await webinar.update({ topic, start_time, duration, description });

        webinarLogger.info(`Webinar updated successfully - Webinar ID: ${id}`);
        return res.json({ message: 'Webinar updated successfully.', data: webinar });
    } catch (error) {
        webinarLogger.error(`Error in updateWebinar: ${error.message}`);
        return res.status(500).json({ message: 'Failed to update webinar', error: error.message });
    }
};

/**
 * ❌ 5. Delete/Cancel Webinar
 */
export const deleteWebinar = async (req, res) => {
    try {
        const { id } = req.params;

        const webinar = await Webinar.findByPk(id);
        if (!webinar) {
            webinarLogger.warn(`Delete Webinar - Webinar not found: ${id}`);
            return res.status(404).json({ message: 'Webinar not found' });
        }

        if (req.user.user.role !== 'admin' && webinar.instructor_id !== req.user.user.id) {
            webinarLogger.warn(`Delete Webinar - Unauthorized for user: ${req.user.user.id}, Webinar: ${id}`);
            return res.status(403).json({ message: 'Unauthorized to delete this webinar' });
        }

        // Cancel on Zoom
        const token = await getZoomAccessToken();
        await axios.delete(`https://api.zoom.us/v2/webinars/${webinar.zoom_webinar_id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        await webinar.update({ status: 'cancelled' });

        webinarLogger.info(`Webinar deleted successfully - Webinar ID: ${id}`);
        return res.json({ message: 'Webinar cancelled successfully.' });
    } catch (error) {
        webinarLogger.error(`Error in deleteWebinar: ${error.message}`);
        return res.status(500).json({ message: 'Failed to cancel webinar', error: error.message });
    }
};

/**
 * 🧾 6. Register for Webinar (Public or Student)
 */
export const registerForWebinar = async (req, res) => {
    try {
        const { webinar_id, name, email } = req.body;

        const webinar = await Webinar.findByPk(webinar_id);
        if (!webinar) {
            webinarLogger.warn(`Register for Webinar - Webinar not found: ${webinar_id}`);
            return res.status(404).json({ message: 'Webinar not found' });
        }

        const existing = await WebinarRegistration.findOne({ where: { webinar_id, email } });
        if (existing) {
            webinarLogger.warn(`Register for Webinar - Already registered: ${email}, Webinar: ${webinar_id}`);
            return res.status(400).json({ message: 'Already registered for this webinar' });
        }

        const registration = await WebinarRegistration.create({
            webinar_id,
            user_id: req.user?.user?.id || null,
            name,
            email
        });

        webinarLogger.info(`User registered for webinar - Webinar ID: ${webinar_id}, Email: ${email}`);
        return res.status(201).json({
            message: 'Registered successfully for the webinar.',
            data: registration
        });
    } catch (error) {
        webinarLogger.error(`Error in registerForWebinar: ${error.message}`);
        return res.status(500).json({ message: 'Failed to register', error: error.message });
    }
};

/**
 * 📋 7. Get Webinar Registrations (Admin/Instructor)
 */
export const getWebinarRegistrations = async (req, res) => {
    try {
        const { webinar_id } = req.params;

        const webinar = await Webinar.findByPk(webinar_id);
        if (!webinar) {
            webinarLogger.warn(`Get Registrations - Webinar not found: ${webinar_id}`);
            return res.status(404).json({ message: 'Webinar not found' });
        }

        if (req.user.user.role !== 'admin' && webinar.instructor_id !== req.user.user.id) {
            webinarLogger.warn(`Get Registrations - Unauthorized for user: ${req.user.user.id}, Webinar: ${webinar_id}`);
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const registrations = await WebinarRegistration.findAll({
            where: { webinar_id },
            order: [['created_at', 'ASC']]
        });

        webinarLogger.info(`Webinar registrations retrieved - Webinar ID: ${webinar_id}, Count: ${registrations.length}`);
        return res.json({
            message: 'Webinar registrations fetched successfully.',
            data: registrations
        });
    } catch (error) {
        webinarLogger.error(`Error in getWebinarRegistrations: ${error.message}`);
        return res.status(500).json({ message: 'Failed to fetch registrations', error: error.message });
    }
};

/**
 * 🔗 8. Join Webinar (Direct Link)
 */
export const joinWebinar = async (req, res) => {
    try {
        const { id } = req.params;

        const webinar = await Webinar.findByPk(id);
        if (!webinar) {
            webinarLogger.warn(`Join Webinar - Webinar not found: ${id}`);
            return res.status(404).json({ message: 'Webinar not found' });
        }

        const userEmail = req.user?.user?.email;
        const joinUrl = webinar.zoom_join_url;
        webinarLogger.info(`User joined webinar - Webinar ID: ${id}, Email: ${userEmail}`);
        return res.json({ message: 'Join link generated successfully.', join_url: joinUrl });
    } catch (error) {
        webinarLogger.error(`Error in joinWebinar: ${error.message}`);
        return res.status(500).json({ message: 'Failed to join webinar', error: error.message });
    }
};

/**
 * 🔏 10. Generate Zoom SDK Signature (for joining via Web SDK)
 */
export const getWebinarSignature = async (req, res) => {
    try {
        const { id } = req.params;
        const webinar = await Webinar.findByPk(id);
        if (!webinar) {
            webinarLogger.warn(`Get Signature - Webinar not found: ${id}`);
            return res.status(404).json({ message: 'Webinar not found' });
        }

        const meetingNumber = webinar.zoom_webinar_id;
        const passWord = webinar.zoom_join_url.includes('pwd=') ? webinar.zoom_join_url.split('pwd=')[1].split('&')[0] : '';

        const userRole = req.user.role || req.user.user.role;
        const userId = req.user.user.id;
        
        // Host role logic (Admin or assigned Instructor)
        let role = (userId === webinar.instructor_id || userRole === 'admin') ? 1 : 0;

        // 🚀 HOST CONSTRAINT: Always use the hardcoded host email for ZAK/Host signature
        const hostEmail = "moneycrafttrader@gmail.com";
        let zakToken = null;

        if (role === 1) {
            try {
                const token = await getZoomAccessToken();
                // Fetch ZAK token for the hardcoded host account
                const zakRes = await axios.get(`https://api.zoom.us/v2/users/${hostEmail}/zak`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                zakToken = zakRes.data.token;
            } catch (err) {
                webinarLogger.error(`Failed to fetch ZAK for ${hostEmail}: ${err.message}`);
                // Fallback to 'me' if direct email fetch fails
                try {
                    const token = await getZoomAccessToken();
                    const zakRes = await axios.get("https://api.zoom.us/v2/users/me/zak", {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    zakToken = zakRes.data.token;
                } catch (retryErr) {
                    webinarLogger.error(`ZAK Fallback failed: ${retryErr.message}`);
                }
            }
        }

        const iat = Math.floor(Date.now() / 1000) - 30;
        const exp = iat + 60 * 60 * 2;

        const payload = {
            sdkKey: process.env.ZOOM_SDK_KEY,
            appKey: process.env.ZOOM_SDK_KEY,
            mn: meetingNumber,
            role,
            iat,
            exp,
            tokenExp: exp,
            video_webrtc_mode: 1
        };

        const token = jwt.sign(payload, process.env.ZOOM_SDK_SECRET, { algorithm: 'HS256' });

        webinarLogger.info(`Zoom signature generated - Webinar ID: ${id}, Role: ${role}`);
        
        return res.json({
            success: true,
            signature: token,
            sdkKey: process.env.ZOOM_SDK_KEY,
            meetingNumber,
            passWord,
            zak: zakToken,
            userEmail: hostEmail
        });
    } catch (err) {
        webinarLogger.error(`Error in getWebinarSignature: ${err.message}`);
        res.status(500).json({ message: 'Failed to generate Zoom signature' });
    }
};

/**
 * 🕒 9. Reminder Placeholder (Cron Job / Scheduler)
 * This would run hourly to send reminders 1 hour before start_time
 */
export const sendWebinarReminders = async () => {
    try {
        const upcomingWebinars = await Webinar.findAll({
            where: db.Sequelize.literal(`TIMESTAMPDIFF(MINUTE, NOW(), start_time) = 60`)
        });

        for (const webinar of upcomingWebinars) {
            const registrations = await WebinarRegistration.findAll({ where: { webinar_id: webinar.id } });
            // Integrate with your email/SMS service here
            // Example: await sendEmailReminder(registrations, webinar);
        }

        webinarLogger.info(`Reminders sent for ${upcomingWebinars.length} webinars`);
    } catch (error) {
        webinarLogger.error(`Error in sendWebinarReminders: ${error.message}`);
    }
};
