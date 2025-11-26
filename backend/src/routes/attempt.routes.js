import express from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { startAttempt, startBlock, submitBlock, uploadAnswerFile, resumeAttempt, logProctoringEvent, getAttemptResult, getAllAttempts } from '../controllers/attempt.controller.js';
import { upload } from '../services/storage.service.js';

const router = express.Router();

router.use(verifyToken);

// Student routes
router.post('/start', requireRole(['student']), startAttempt);
router.get('/resume', requireRole(['student']), resumeAttempt);
router.get('/my-attempts', requireRole(['student']), getAllAttempts);
router.get('/:id/result', requireRole(['student']), getAttemptResult);

router.post('/block/start', requireRole(['student']), startBlock);
router.post('/block/submit', requireRole(['student']), submitBlock);

router.post('/upload', requireRole(['student']), upload.single('answer_file'), uploadAnswerFile);

router.post('/proctor/log', requireRole(['student']), logProctoringEvent);

export default router;
