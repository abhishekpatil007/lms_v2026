import express from 'express';
import { getDashboardStats } from '../controllers/stats.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = express.Router();

router.get('/dashboard', verifyToken, requireRole(['admin']), getDashboardStats);

export default router;
