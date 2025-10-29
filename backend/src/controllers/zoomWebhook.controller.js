// src/controllers/zoomWebhook.controller.js
import db from "../models/index.js";
const { LiveClass } = db;

export const handleZoomWebhook = async (req, res) => {
    try {
        const event = req.body.event;
        const payload = req.body.payload;

        if (!event || !payload?.object?.id) {
            return res.status(400).json({ message: "Invalid webhook payload" });
        }

        const meetingId = payload.object.id;

        // Find matching LiveClass
        const liveClass = await LiveClass.findOne({
            where: { zoom_meeting_id: meetingId.toString() },
        });

        if (!liveClass) {
            console.warn(`⚠️ No LiveClass found for meeting ID: ${meetingId}`);
            return res.status(200).send();
        }

        switch (event) {
            case "meeting.started":
                await liveClass.update({ status: "live" });
                console.log(`🎥 Live class ${liveClass.id} started`);
                break;
            case "meeting.ended":
                await liveClass.update({ status: "completed" });
                console.log(`✅ Live class ${liveClass.id} completed`);
                break;
            default:
                console.log(`ℹ️ Unhandled Zoom event: ${event}`);
                break;
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).json({ message: "Failed to handle Zoom webhook" });
    }
};
