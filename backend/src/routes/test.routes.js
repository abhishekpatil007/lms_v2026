import express from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { createTest, addBlock, addQuestion, getTestDetails, publishTest, listTests } from '../controllers/test.controller.js';
import { upload } from '../services/storage.service.js';

const router = express.Router();

// Only Instructors and Admins can manage tests
router.use(verifyToken);

router.get('/', requireRole(['instructor', 'admin', 'student']), listTests);
router.post('/', requireRole(['instructor', 'admin']), createTest);
router.get('/:id', requireRole(['instructor', 'admin', 'student']), getTestDetails); // Students might need to see details before starting
router.put('/:id/publish', requireRole(['instructor', 'admin']), publishTest);

router.post('/:test_id/blocks', requireRole(['instructor', 'admin']), addBlock);

router.post('/blocks/:block_id/questions', requireRole(['instructor', 'admin']), upload.single('reference_media'), addQuestion);

export default router;
