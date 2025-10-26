// import express from 'express';
// import { startAttendancePoll, respondToPoll, getPollResults } from '../controllers/attendance.controller.js';
// import { verifyToken } from '../middleware/auth.middleware.js';
// import { requireRole } from '../middleware/role.middleware.js';

// const router = express.Router();
// router.post('/batches/:id/poll', verifyToken, requireRole(['instructor','admin']), startAttendancePoll);
// router.post('/polls/:pollId/respond', verifyToken, requireRole(['student']), respondToPoll);
// router.get('/polls/:pollId/results', verifyToken, requireRole(['instructor','admin']), getPollResults);
// export default router;
