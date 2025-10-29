import express from "express";
import { handleZoomWebhook } from "../controllers/zoomWebhook.controller.js";

const router = express.Router();

router.post("/webhook", express.json({ type: "*/*" }), handleZoomWebhook);

export default router;
