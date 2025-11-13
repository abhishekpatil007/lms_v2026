// src/controllers/zoomWebhook.controller.js
import db from "../models/index.js";
import zoomWebhookLogger from "../utils/logger/individualLogger/zoomWebhookLogger.js";
const { LiveClass } = db;

export const handleZoomWebhook = async (req, res) => {
    try {
        const event = req.body.event;
        const payload = req.body.payload;

        if (!event || !payload?.object?.id) {
            zoomWebhookLogger.warn('Zoom Webhook - Invalid webhook payload');
            return res.status(400).json({ message: "Invalid webhook payload" });
        }

        const meetingId = payload.object.id;

        // Find matching LiveClass
        const liveClass = await LiveClass.findOne({
            where: { zoom_meeting_id: meetingId.toString() },
        });

        if (!liveClass) {
            zoomWebhookLogger.warn(`Zoom Webhook - No LiveClass found for meeting ID: ${meetingId}`);
            return res.status(200).send();
        }

        switch (event) {
            case "meeting.started":
                await liveClass.update({ status: "live" });
                zoomWebhookLogger.info(`Meeting started - Live Class ID: ${liveClass.id}, Meeting ID: ${meetingId}`);
                break;
            case "meeting.ended":
                await liveClass.update({ status: "completed" });
                zoomWebhookLogger.info(`Meeting ended - Live Class ID: ${liveClass.id}, Meeting ID: ${meetingId}`);
                break;
            default:
                zoomWebhookLogger.info(`Unhandled Zoom event: ${event}`);
                break;
        }

        res.status(200).json({ received: true });
    } catch (error) {
        zoomWebhookLogger.error(`Error in handleZoomWebhook: ${error.message}`);
        res.status(500).json({ message: "Failed to handle Zoom webhook" });
    }
};
