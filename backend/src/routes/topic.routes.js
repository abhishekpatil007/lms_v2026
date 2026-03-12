import express from 'express';
import { createTopic, updateTopic, deleteTopic, listTopicsByBatch } from '../controllers/topic.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = express.Router();

router.post('/', verifyToken, requireRole(['admin', 'instructor']), createTopic);
router.put('/:id', verifyToken, requireRole(['admin', 'instructor']), updateTopic);
router.delete('/:id', verifyToken, requireRole(['admin', 'instructor']), deleteTopic);
router.get('/batch/:batch_id', verifyToken, listTopicsByBatch);

export default router;
