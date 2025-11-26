import express from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { getPendingEvaluations, getAttemptDetails, submitScore } from '../controllers/evaluation.controller.js';

const router = express.Router();

router.use(verifyToken);
router.use(requireRole(['instructor', 'admin']));

router.get('/pending', getPendingEvaluations);
router.get('/attempt/:attempt_id', getAttemptDetails);
router.post('/attempt/:attempt_id/score', submitScore);

export default router;
