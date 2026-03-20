// src/routes/video.routes.js
import express from 'express';
import {
    createDirectUpload,
    muxWebhookHandler,
    listVideos,
    getVideo,
    getPlaybackUrl,
    deleteVideo,
    assignBatches,
} from '../controllers/video.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = express.Router();

// Create direct upload (only instructor/admin)
router.post('/upload', verifyToken, requireRole(['instructor', 'admin']), createDirectUpload);

// Assign video to batches
router.post('/:id/assign-batches', verifyToken, assignBatches);

// List videos (role-aware)
router.get('/', verifyToken, listVideos);

// Get video metadata
router.get('/:id', verifyToken, getVideo);

// Get playback URL
router.get('/:id/playback', verifyToken, getPlaybackUrl);

// Delete (instructor owning batch or admin)
router.delete('/:id', verifyToken, requireRole(['instructor', 'admin']), deleteVideo);

// Webhook - raw body parsing is handled in app.js before express.json()
router.post('/webhooks/mux', muxWebhookHandler);

export default router;
