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

// 🧩 Helper: Create Zoom Webinar
const createZoomWebinar = async (topic, startTime, duration, instructorEmail = null) => {
    const token = await getZoomAccessToken();

    const body = {
        topic,
        type: 5, // Webinar
        start_time: startTime, // ISO8601
        timezone: 'Asia/Kolkata',
        duration,
        settings: {
            approval_type: 2,   // NO REGISTRATION REQUIRED
            registration_type: 0,
            host_video: true,
            panelists_video: true,
            auto_recording: "cloud"
        },
    };

    if (instructorEmail) {
        body.settings.alternative_hosts = instructorEmail;
    }

    try {
        const response = await axios.post(
            "https://api.zoom.us/v2/users/me/webinars",
            body,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        return response.data;
    } catch (error) {
        // If alternative_hosts fails (not a licensed user), retry without it
        if (instructorEmail && error.response && error.response.status === 400) {
            delete body.settings.alternative_hosts;
            const retryResponse = await axios.post(
                "https://api.zoom.us/v2/users/me/webinars",
                body,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            return retryResponse.data;
        }
        throw error;
    }
};

// 🧩 Helper: Create Webinar Registrant
const createWebinarRegistrant = async (webinarId, email, firstName) => {
    try {
        const token = await getZoomAccessToken();
        const response = await axios.post(
            `https://api.zoom.us/v2/webinars/${webinarId}/registrants`,
            {
                email,
                first_name: firstName,
            },
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        return response.data;
    } catch (error) {
        // Handle duplicate registrant gracefully
        if (error.response && error.response.status === 400 && error.response.data.code === 3001) {
            liveClassLogger.info(`User ${email} already registered for webinar ${webinarId}`);
            // Zoom might return the join_url in some cases, or we might need to fetch it.
            // For now, let's assume we can retry or it's handled.
            // Or better, if we have the registrant info, we can get it.
            // Actually, if they are registered, we can try to GET the list or just return the error handled if the client can handle it.
            // But the requirement says: "Return existing join_url if possible"
            // To get the join_url for an existing registrant, we might need to list them.
            // However, Zoom often returns the registrant info even on conflict if we use a different approach, 
            // but standard behavior is error. Let's try to fetch if it fails.
            const token = await getZoomAccessToken();
            const listResponse = await axios.get(
                `https://api.zoom.us/v2/webinars/${webinarId}/registrants`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            const existing = listResponse.data.registrants?.find(r => r.email === email);
            if (existing) return existing;
        }
        throw error;
    }
};

//
// 🎯 1. Create Live Class (Instructor/Admin)
//
export const createLiveClass = async (req, res) => {
    try {
        const { batch_id, topic, start_time, duration, description = "NA" } = req.body;
        const user = req.user.user;

        // Step 0: Identify the correct instructor for this class
        let instructor_id = user.id;
        const batchData = await db.Batch.findByPk(batch_id);
        
        // If Admin creates class, use the Batch's assigned instructor
        if (user.role === 'admin' && batchData && batchData.instructor_id) {
            instructor_id = batchData.instructor_id;
        }

        // Step 1: Create Zoom webinar
        const instructorUser = await db.User.findByPk(instructor_id);
        const instructorEmail = instructorUser ? instructorUser.email : user.email;
        const zoomWebinar = await createZoomWebinar(topic, start_time, duration, instructorEmail);

        // Step 1.1: Add instructor as panelist (Optional but safe)
        try {
            const token = await getZoomAccessToken();
            await axios.post(
                `https://api.zoom.us/v2/webinars/${zoomWebinar.id}/panelists`,
                { panelists: [{ email: instructorEmail, name: req.user.user.name || "Instructor" }] },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (panelError) {
            liveClassLogger.error(`Failed to add instructor as panelist: ${panelError.message}`);
        }

        // Step 2: Save to DB
        const liveClass = await LiveClass.create({
            batch_id,
            instructor_id,
            topic,
            description,
            start_time,
            duration,
            zoom_meeting_id: zoomWebinar.id,
            zoom_meeting_password: zoomWebinar.password,
            zoom_join_url: zoomWebinar.join_url,
            zoom_start_url: zoomWebinar.start_url,
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

        // Auto-complete classes whose end time has passed
        const now = new Date();
        await Promise.all(
            rows
                .filter(lc => (lc.status === 'scheduled' || lc.status === 'live') && new Date(lc.start_time).getTime() + lc.duration * 60 * 1000 < now.getTime())
                .map(lc => lc.update({ status: 'completed' }))
        );

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
                    `https://api.zoom.us/v2/webinars/${meetingNumber}`,
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
        const userId = req.user.user.id;
        
        // Fetch the batch to check assigned instructor
        const batch = await db.Batch.findByPk(classData.batch_id);
        const batchInstructorId = batch ? batch.instructor_id : null;

        // 🚀 REFINED FIX: Check body, query, or fallback to DB logic
        let role = parseInt(req.body.role ?? req.query.role);
        if (isNaN(role)) {
            // Host if user is the assigned instructor of the class OR the batch
            // Using loose equality (==) for BIGINT IDs which might be strings or numbers
            role = (userId == classData.instructor_id || userId == batchInstructorId || userRole === 'admin') ? 1 : 0;
        }

        // Security check: Only instructors or admins can be role 1
        if (role === 1 && userRole !== 'instructor' && userRole !== 'admin') {
            role = 0;
        }

        let hostEmail = "moneycrafttrader@gmail.com";
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
                liveClassLogger.error(`Failed to fetch ZAK for ${hostEmail}: ${err.message}`);
                // Fallback to 'me' if specific email fetch fails
                try {
                    const token = await getZoomAccessToken();
                    const zakRes = await axios.get("https://api.zoom.us/v2/users/me/zak", {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    zakToken = zakRes.data.token;
                } catch (retryErr) {
                    liveClassLogger.error(`ZAK Fallback failed: ${retryErr.message}`);
                }
            }
        }

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
        
        // Registration is no longer required for joining webinars
        const registrantToken = null;

        return res.json({
            success: true,
            signature: token,
            sdkKey: process.env.ZOOM_SDK_KEY,
            meetingNumber,
            passWord: passWord,
            tk: registrantToken,
            zak: zakToken, // Essential for host join
            userEmail: hostEmail // Provide host email if role is 1 to help Web SDK join correctly
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
        const instructorEmail = req.user.user.email;
        await axios.patch(
            `https://api.zoom.us/v2/webinars/${liveClass.zoom_meeting_id}`,
            {
                topic,
                start_time,
                timezone: 'Asia/Kolkata',
                duration,
                agenda: description,
                settings: {
                    approval_type: 2, // Ensure registration remains off
                    alternative_hosts: instructorEmail
                }
            },
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        ).catch(async (err) => {
            // Retry without alternative_hosts if it fails
            if (err.response && err.response.status === 400) {
                await axios.patch(
                    `https://api.zoom.us/v2/webinars/${liveClass.zoom_meeting_id}`,
                    { topic, start_time, timezone: 'Asia/Kolkata', duration, agenda: description },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            } else throw err;
        });

        // Add/Update instructor as panelist
        try {
            const webinarId = liveClass.zoom_meeting_id;
            await axios.post(
                `https://api.zoom.us/v2/webinars/${webinarId}/panelists`,
                { panelists: [{ email: instructorEmail, name: req.user.user.name || "Instructor" }] },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (panelError) {
            liveClassLogger.error(`Failed to add/update panelist: ${panelError.message}`);
        }

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

        // Cancel Zoom meeting (Robust handling)
        if (liveClass.zoom_meeting_id) {
            try {
                const token = await getZoomAccessToken();
                await axios.delete(
                    `https://api.zoom.us/v2/webinars/${liveClass.zoom_meeting_id}`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                liveClassLogger.info(`Zoom meeting deleted - Meeting ID: ${liveClass.zoom_meeting_id}`);
            } catch (zoomError) {
                // If meeting is already gone or link broken, we still want to delete locally
                if (zoomError.response?.status === 404) {
                    liveClassLogger.warn(`Zoom meeting already deleted on Zoom cloud - Meeting ID: ${liveClass.zoom_meeting_id}`);
                } else {
                    liveClassLogger.error(`Warning: Failed to delete Zoom meeting: ${zoomError.message}`);
                    // We continue anyway to ensure local DB is cleared
                }
            }
        }

        // Permanently delete from local DB
        await liveClass.destroy();

        liveClassLogger.info(`Live class deleted successfully from DB - Live Class ID: ${id}`);
        return res.json({ message: "Live class deleted successfully." });
    } catch (error) {
        liveClassLogger.error(`Error in deleteLiveClass: ${error.message}`);
        res
            .status(500)
            .json({ message: "Failed to delete live class", error: error.message });
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
        let joinUrl = liveClass.zoom_join_url;
        const user = req.user.user;
 
        if (user.role === "instructor" || user.role === "admin") {
            joinUrl = liveClass.zoom_start_url;
        } else {
            // Registration not required, students join via the generic join URL 
            joinUrl = liveClass.zoom_join_url;
        }

        liveClassLogger.info(`Join link generated - Live Class ID: ${id}, User Role: ${user.role}`);
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