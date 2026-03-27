import express from 'express';
import {
    createWebinar,
    getAllWebinars,
    getWebinarById,
    updateWebinar,
    deleteWebinar,
    registerForWebinar,
    getWebinarRegistrations,
    joinWebinar,
    getWebinarSignature
} from '../controllers/webinar.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = express.Router();

/**
 * 🎯 Create a Webinar (Admin / Instructor)
 * POST /api/webinars
 */
router.post(
    '/',
    verifyToken,
    requireRole(['instructor', 'admin']),
    createWebinar
);

/**
 * 📅 Get All Webinars (Public View)
 * GET /api/webinars
 */
router.get('/', getAllWebinars);

/**
 * 🔍 Get Webinar by ID (Public View)
 * GET /api/webinars/:id
 */
router.get('/:id', getWebinarById);

/**
 * ✏️ Update Webinar (Admin / Instructor)
 * PUT /api/webinars/:id
 */
router.put(
    '/:id',
    verifyToken,
    requireRole(['instructor', 'admin']),
    updateWebinar
);

/**
 * ❌ Delete/Cancel Webinar (Admin / Instructor)
 * DELETE /api/webinars/:id
 */
router.delete(
    '/:id',
    verifyToken,
    requireRole(['instructor', 'admin']),
    deleteWebinar
);

/**
 * 🧾 Register for Webinar (Public or Logged-In Student)
 * POST /api/webinars/register
 */
router.post(
    '/register',
    registerForWebinar
);

/**
 * 📋 Get Webinar Registrations (Admin / Instructor)
 * GET /api/webinars/:webinar_id/registrations
 */
router.get(
    '/:webinar_id/registrations',
    verifyToken,
    requireRole(['instructor', 'admin']),
    getWebinarRegistrations
);

/**
 * 🔗 Join Webinar (Registered User Only)
 * GET /api/webinars/:id/join
 */
router.get(
    '/:id/join',
    verifyToken,
    requireRole(['student', 'instructor', 'admin']),
    joinWebinar
);

/**
 * 🔏 Get signature for webinar (to be used by frontend Zoom Web SDK)
 * POST /api/webinars/:id/signature
 */
router.post(
    '/:id/signature',
    verifyToken,
    requireRole(['student', 'instructor', 'admin']),
    getWebinarSignature
);

export default router;
