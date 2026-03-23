// src/routes/liveClass.routes.js
import express from 'express';
import {
    createLiveClass,
    getBatchLiveClasses,
    getLiveClassSignature,
    updateLiveClass,
    deleteLiveClass,
    getLiveClassById,
    joinLiveClass,
} from '../controllers/liveClass.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = express.Router();

// Instructor creates a live class for their batch
router.post('/', verifyToken, requireRole(['instructor', 'admin']), createLiveClass);

// List live classes for a batch (instructor or student)
router.get('/batch/:batch_id', verifyToken, requireRole(['instructor', 'student', 'admin']), getBatchLiveClasses);

// Get signature for live class (to be used by frontend Zoom Web SDK)
router.post('/:id/signature', verifyToken, requireRole(['instructor', 'student', 'admin']), getLiveClassSignature);

router.put("/:id", verifyToken, requireRole(["instructor", "admin"]), updateLiveClass);
router.delete("/:id", verifyToken, requireRole(["instructor", "admin"]), deleteLiveClass);
router.get("/:id", verifyToken, requireRole(["instructor", "student", "admin"]), getLiveClassById);
router.get("/:id/join", verifyToken, requireRole(["instructor", "student"]), joinLiveClass);

export default router;
