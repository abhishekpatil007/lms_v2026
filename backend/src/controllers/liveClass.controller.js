import dotenv from 'dotenv';
dotenv.config();
import axios from "axios";
import db from "../models/index.js";
import jwt from 'jsonwebtoken';
import { getZoomAccessToken } from "../services/zoomAuth.service.js";
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
            zoom_join_url: zoomMeeting.join_url,
            zoom_start_url: zoomMeeting.start_url,
            status: "scheduled",
        });

        // Step 3: Notify participants
        // await notifyLiveClass(liveClass);

        return res.status(201).json({
            message: "Live class created successfully.",
            data: liveClass,
        });
    } catch (error) {
        console.error("Create Live Class Error:", error.response?.data || error);
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

        const classes = await LiveClass.findAll({
            where: { batch_id },
            order: [["start_time", "ASC"]],
        });

        res.status(200).json({
            message: "Live classes fetched successfully.",
            data: classes,
        });
    } catch (error) {
        console.error("Get Batch Classes Error:", error);
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
        if (!classData) return res.status(404).json({ message: 'Live class not found' });

        const meetingNumber = classData.zoom_meeting_id;
        const role = req.user.role === 'instructor' ? 1 : 0; // 1 = host, 0 = participant

        const iat = Math.round(new Date().getTime() / 1000);
        const exp = iat + 60 * 60 * 2; // 2 hours

        const payload = {
            sdkKey: process.env.ZOOM_SDK_KEY,
            mn: meetingNumber,
            role,
            iat,
            exp,
            tokenExp: exp,
        };

        const token = jwt.sign(payload, process.env.ZOOM_SDK_SECRET, { algorithm: 'HS256' });

        return res.json({
            success: true,
            signature: token,
            sdkKey: process.env.ZOOM_SDK_KEY,
            meetingNumber,
        });
    } catch (err) {
        console.error('getLiveClassSignature error:', err);
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
        if (!liveClass)
            return res.status(404).json({ message: "Live class not found" });

        // Check permission (instructor owns it or admin)
        if (
            req.user.user.role !== "admin" &&
            liveClass.instructor_id !== req.user.user.id
        ) {
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

        return res.json({
            message: "Live class updated successfully.",
            data: liveClass,
        });
    } catch (error) {
        console.error("Update Live Class Error:", error.response?.data || error);
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
        if (!liveClass)
            return res.status(404).json({ message: "Live class not found" });

        // Only admin or class instructor can delete
        if (
            req.user.user.role !== "admin" &&
            liveClass.instructor_id !== req.user.user.id
        ) {
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

        return res.json({ message: "Live class cancelled successfully." });
    } catch (error) {
        console.error("Delete Live Class Error:", error.response?.data || error);
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

        if (!liveClass)
            return res.status(404).json({ message: "Live class not found" });

        return res.json({
            message: "Live class fetched successfully.",
            data: liveClass,
        });
    } catch (error) {
        console.error("Get Live Class Error:", error);
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

        if (!liveClass)
            return res.status(404).json({ message: "Live class not found" });

        // Simple role-based redirect logic
        const joinUrl =
            req.user.user.role === "instructor"
                ? liveClass.zoom_start_url
                : liveClass.zoom_join_url;

        return res.json({
            message: "Join link generated successfully.",
            join_url: joinUrl,
        });
    } catch (error) {
        console.error("Join Live Class Error:", error);
        res
            .status(500)
            .json({ message: "Failed to join live class", error: error.message });
    }
};