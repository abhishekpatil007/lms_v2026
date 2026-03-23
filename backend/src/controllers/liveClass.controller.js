import dotenv from 'dotenv';
dotenv.config();
import axios from "axios";
import db from "../models/index.js";
import jwt from 'jsonwebtoken';
import { getZoomAccessToken } from "../services/zoomAuth.service.js";
import { isUserAuthorizedForBatch } from "../utils/batchHelper.js";
import liveClassLogger from '../utils/logger/individualLogger/liveClassLogger.js';
// import { notifyLiveClass } from "../services/liveClassEmail.service.js";

const { LiveClass } = db;

// 🧩 Helper: Create Zoom Meeting
const createZoomMeeting = async (topic, startTime, duration) => {
    const token = await getZoomAccessToken();

    const response = await axios.post(
        "https://api.zoom.us/v2/users/me/meetings",
        {
            topic,
            type: 2, // Scheduled meeting
            start_time: startTime, // ISO8601
            duration,
            settings: {
                host_video: true,
                participant_video: true,
                join_before_host: false,
                mute_upon_entry: true,
                waiting_room: true,
            },
        },
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    );

    return response.data;
};

//
// 🎯 1. Create Live Class (Instructor/Admin)
//
export const createLiveClass = async (req, res) => {
    try {
        const { batch_id, topic, start_time, duration, description = "NA" } = req.body;
        const instructor_id = req.user.user.id; // comes from verifyToken middleware

        // Step 1: Create Zoom meeting
        const zoomMeeting = await createZoomMeeting(topic, start_time, duration);

        // Step 2: Save to DB
        const liveClass = await LiveClass.create({
            batch_id,
            instructor_id,
            topic,
            description,
            start_time,
            duration,
            zoom_meeting_id: zoomMeeting.id,
            zoom_meeting_password: zoomMeeting.password,
            zoom_join_url: zoomMeeting.join_url,
            zoom_start_url: zoomMeeting.start_url,
            status: "scheduled",
        });

        // Step 3: Notify participants
        // await notifyLiveClass(liveClass);

        liveClassLogger.info(`Live class created successfully - Live Class ID: ${liveClass.id}, Batch ID: ${batch_id}, Topic: ${topic}`);
        return res.status(201).json({
            message: "Live class created successfully.",
            data: liveClass,
        });
    } catch (error) {
        liveClassLogger.error(`Error in createLiveClass: ${error.message}`);
        return res
            .status(500)
            .json({ message: "Failed to create live class", error: error.message });
    }
};

//
// 📅 2. Get All Live Classes for a Batch
//
export const getBatchLiveClasses = async (req, res) => {
    try {
        const { batch_id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const { count, rows } = await LiveClass.findAndCountAll({
            where: { batch_id },
            order: [["start_time", "DESC"]], // Show newest first usually makes sense for pagination
            limit: parseInt(limit),
            offset: parseInt(offset),
        });

        liveClassLogger.info(`Batch live classes retrieved - Batch ID: ${batch_id}, Count: ${rows.length}`);
        
        // Return standard data format, but we keep data: ... for backward compatibility if needed, though best to format consistently
        res.status(200).json({
            message: "Live classes fetched successfully.",
            data: rows, // Keep 'data' so existing logic doesn't break if not using 'liveClasses' key directly
            liveClasses: rows,
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        liveClassLogger.error(`Error in getBatchLiveClasses: ${error.message}`);
        res
            .status(500)
            .json({ message: "Failed to fetch live classes", error: error.message });
    }
};

//
// 🔏 3. Generate Zoom SDK Signature (for joining via Web SDK)
//

export const getLiveClassSignature = async (req, res) => {
    try {
        const { id } = req.params;
        const classData = await LiveClass.findByPk(id);
        if (!classData) {
            liveClassLogger.warn(`Get Signature - Live class not found: ${id}`);
            return res.status(404).json({ message: 'Live class not found' });
        }

        const meetingNumber = classData.zoom_meeting_id;
        let passWord = classData.zoom_meeting_password;

        // Fallback for existing meetings without stored passcode
        if (!passWord) {
            console.log(`[PASSCODE FALLBACK] No password in DB for meeting ${meetingNumber}. Fetching from Zoom...`);
            try {
                const token = await getZoomAccessToken();
                const zoomResponse = await axios.get(
                    `https://api.zoom.us/v2/meetings/${meetingNumber}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                passWord = zoomResponse.data.password;
                console.log(`[PASSCODE FALLBACK] Successfully fetched passcode: ${passWord}`);
                if (passWord) {
                    await classData.update({ zoom_meeting_password: passWord });
                }
            } catch (zoomErr) {
                console.error(`[PASSCODE FALLBACK] Failed to fetch from Zoom:`, zoomErr.response?.data || zoomErr.message);
                liveClassLogger.error(`Failed to fetch fallback passcode for ${meetingNumber}: ${zoomErr.message}`);
            }
        }

        const userRole = req.user.role || req.user.user.role;
        const role = (userRole === 'instructor' || userRole === 'admin') ? 1 : 0; // 1 = host, 0 = participant

        // Batch access check
        const isAuthorized = await isUserAuthorizedForBatch(req.user.user.id, classData.batch_id, userRole);
        if (!isAuthorized) {
            liveClassLogger.warn(`Get Signature - Unauthorized access: User ${req.user.user.id}, Class ${id}`);
            return res.status(403).json({ message: 'Unauthorized to join this class' });
        }

        const iat = Math.floor(Date.now() / 1000) - 30; // Subtract 30 seconds for clock drift
        const exp = iat + 60 * 60 * 2; // 2 hours

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

        liveClassLogger.info(`Zoom signature generated - Live Class ID: ${id}, Role: ${role}`);
        return res.json({
            success: true,
            signature: token,
            sdkKey: process.env.ZOOM_SDK_KEY,
            meetingNumber,
            passWord: passWord
        });
    } catch (err) {
        liveClassLogger.error(`Error in getLiveClassSignature: ${err.message}`);
        res.status(500).json({ message: 'Failed to generate Zoom signature' });
    }
};


//
// ✏️ 4. Update Live Class
//
export const updateLiveClass = async (req, res) => {
    try {
        const { id } = req.params;
        const { topic, start_time, duration, description } = req.body;

        const liveClass = await LiveClass.findByPk(id);
        if (!liveClass) {
            liveClassLogger.warn(`Update Live Class - Live class not found: ${id}`);
            return res.status(404).json({ message: "Live class not found" });
        }

        // Check permission (instructor owns it or admin)
        if (
            req.user.user.role !== "admin" &&
            liveClass.instructor_id !== req.user.user.id
        ) {
            liveClassLogger.warn(`Update Live Class - Unauthorized for user: ${req.user.user.id}, Live Class: ${id}`);
            return res.status(403).json({ message: "Unauthorized to edit this class" });
        }

        // Update on Zoom first
        const token = await getZoomAccessToken();
        await axios.patch(
            `https://api.zoom.us/v2/meetings/${liveClass.zoom_meeting_id}`,
            {
                topic,
                start_time,
                duration,
                agenda: description,
            },
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );

        // Update local DB
        await liveClass.update({ topic, start_time, duration, description });

        liveClassLogger.info(`Live class updated successfully - Live Class ID: ${id}`);
        return res.json({
            message: "Live class updated successfully.",
            data: liveClass,
        });
    } catch (error) {
        liveClassLogger.error(`Error in updateLiveClass: ${error.message}`);
        res
            .status(500)
            .json({ message: "Failed to update live class", error: error.message });
    }
};

//
// ❌ 5. Delete/Cancel Live Class
//
export const deleteLiveClass = async (req, res) => {
    try {
        const { id } = req.params;

        const liveClass = await LiveClass.findByPk(id);
        if (!liveClass) {
            liveClassLogger.warn(`Delete Live Class - Live class not found: ${id}`);
            return res.status(404).json({ message: "Live class not found" });
        }

        // Only admin or class instructor can delete
        if (
            req.user.user.role !== "admin" &&
            liveClass.instructor_id !== req.user.user.id
        ) {
            liveClassLogger.warn(`Delete Live Class - Unauthorized for user: ${req.user.user.id}, Live Class: ${id}`);
            return res.status(403).json({ message: "Unauthorized to delete this class" });
        }

        // Cancel Zoom meeting
        const token = await getZoomAccessToken();
        await axios.delete(
            `https://api.zoom.us/v2/meetings/${liveClass.zoom_meeting_id}`,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );

        // Update local DB
        await liveClass.update({ status: "cancelled" });

        liveClassLogger.info(`Live class deleted successfully - Live Class ID: ${id}`);
        return res.json({ message: "Live class cancelled successfully." });
    } catch (error) {
        liveClassLogger.error(`Error in deleteLiveClass: ${error.message}`);
        res
            .status(500)
            .json({ message: "Failed to cancel live class", error: error.message });
    }
};

//
// 🔍 6. Get Live Class by ID (Instructor/Student/Admin)
//
export const getLiveClassById = async (req, res) => {
    try {
        const { id } = req.params;

        const liveClass = await LiveClass.findByPk(id, {
            include: [
                { association: "batch" },
                { association: "instructor" },
            ],
        });

        if (!liveClass) {
            liveClassLogger.warn(`Get Live Class - Live class not found: ${id}`);
            return res.status(404).json({ message: "Live class not found" });
        }

        liveClassLogger.info(`Live class retrieved - Live Class ID: ${id}`);
        return res.json({
            message: "Live class fetched successfully.",
            data: liveClass,
        });
    } catch (error) {
        liveClassLogger.error(`Error in getLiveClassById: ${error.message}`);
        res
            .status(500)
            .json({ message: "Failed to get live class", error: error.message });
    }
};

//
// 🔗 7. Join Live Class (Instructor/Student)
//
export const joinLiveClass = async (req, res) => {
    try {
        const { id } = req.params;
        const liveClass = await LiveClass.findByPk(id);

        if (!liveClass) {
            liveClassLogger.warn(`Join Live Class - Live class not found: ${id}`);
            return res.status(404).json({ message: "Live class not found" });
        }

        // Batch access check
        const isAuthorized = await isUserAuthorizedForBatch(req.user.user.id, liveClass.batch_id, req.user.user.role);
        if (!isAuthorized) {
            liveClassLogger.warn(`Join Live Class - Unauthorized access: User ${req.user.user.id}, Class ${id}`);
            return res.status(403).json({ message: "Unauthorized to join this class" });
        }

        // Simple role-based redirect logic
        const joinUrl =
            req.user.user.role === "instructor"
                ? liveClass.zoom_start_url
                : liveClass.zoom_join_url;

        liveClassLogger.info(`Join link generated - Live Class ID: ${id}, User Role: ${req.user.user.role}`);
        return res.json({
            message: "Join link generated successfully.",
            join_url: joinUrl,
        });
    } catch (error) {
        liveClassLogger.error(`Error in joinLiveClass: ${error.message}`);
        res
            .status(500)
            .json({ message: "Failed to join live class", error: error.message });
    }
};