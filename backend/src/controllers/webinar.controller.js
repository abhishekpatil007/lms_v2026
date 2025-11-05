import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import db from '../models/index.js';
import jwt from 'jsonwebtoken';
import { getZoomAccessToken } from '../services/zoomAuth.service.js';

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
                approval_type: 0, // Automatically approve
                registration_type: 1,
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
        const instructor_id = req.user.user.id;

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

        return res.status(201).json({
            message: 'Webinar created successfully.',
            data: webinar
        });
    } catch (error) {
        console.error('Create Webinar Error:', error.response?.data || error);
        return res.status(500).json({ message: 'Failed to create webinar', error: error.message });
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

        return res.json({ message: 'Webinars fetched successfully.', data: webinars });
    } catch (error) {
        console.error('Get All Webinars Error:', error);
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

        if (!webinar) return res.status(404).json({ message: 'Webinar not found' });

        return res.json({ message: 'Webinar fetched successfully.', data: webinar });
    } catch (error) {
        console.error('Get Webinar Error:', error);
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
        if (!webinar) return res.status(404).json({ message: 'Webinar not found' });

        // Permission check
        if (req.user.user.role !== 'admin' && webinar.instructor_id !== req.user.user.id) {
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

        return res.json({ message: 'Webinar updated successfully.', data: webinar });
    } catch (error) {
        console.error('Update Webinar Error:', error.response?.data || error);
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
        if (!webinar) return res.status(404).json({ message: 'Webinar not found' });

        if (req.user.user.role !== 'admin' && webinar.instructor_id !== req.user.user.id) {
            return res.status(403).json({ message: 'Unauthorized to delete this webinar' });
        }

        // Cancel on Zoom
        const token = await getZoomAccessToken();
        await axios.delete(`https://api.zoom.us/v2/webinars/${webinar.zoom_webinar_id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        await webinar.update({ status: 'cancelled' });

        return res.json({ message: 'Webinar cancelled successfully.' });
    } catch (error) {
        console.error('Delete Webinar Error:', error.response?.data || error);
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
        if (!webinar) return res.status(404).json({ message: 'Webinar not found' });

        const existing = await WebinarRegistration.findOne({ where: { webinar_id, email } });
        if (existing) return res.status(400).json({ message: 'Already registered for this webinar' });

        const registration = await WebinarRegistration.create({
            webinar_id,
            user_id: req.user?.user?.id || null,
            name,
            email
        });

        return res.status(201).json({
            message: 'Registered successfully for the webinar.',
            data: registration
        });
    } catch (error) {
        console.error('Webinar Registration Error:', error);
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
        if (!webinar) return res.status(404).json({ message: 'Webinar not found' });

        if (req.user.user.role !== 'admin' && webinar.instructor_id !== req.user.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const registrations = await WebinarRegistration.findAll({
            where: { webinar_id },
            order: [['created_at', 'ASC']]
        });

        return res.json({
            message: 'Webinar registrations fetched successfully.',
            data: registrations
        });
    } catch (error) {
        console.error('Get Webinar Registrations Error:', error);
        return res.status(500).json({ message: 'Failed to fetch registrations', error: error.message });
    }
};

/**
 * 🔗 8. Join Webinar (Registered User Only)
 */
export const joinWebinar = async (req, res) => {
    try {
        const { id } = req.params;

        const webinar = await Webinar.findByPk(id);
        if (!webinar) return res.status(404).json({ message: 'Webinar not found' });

        const userEmail = req.user?.user?.email;
        const isRegistered = await WebinarRegistration.findOne({
            where: { webinar_id: id, email: userEmail }
        });

        if (!isRegistered) {
            return res.status(403).json({ message: 'You are not registered for this webinar.' });
        }

        const joinUrl = webinar.zoom_join_url;
        return res.json({ message: 'Join link generated successfully.', join_url: joinUrl });
    } catch (error) {
        console.error('Join Webinar Error:', error);
        return res.status(500).json({ message: 'Failed to join webinar', error: error.message });
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

        console.log(`Reminders sent for ${upcomingWebinars.length} webinars`);
    } catch (error) {
        console.error('Send Webinar Reminder Error:', error);
    }
};
