import express from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { createTest, addBlock, addQuestion, getTestDetails, publishTest, listTests, updateTest, deleteTest, deleteBlock, deleteQuestion, updateBlock, updateQuestion } from '../controllers/test.controller.js';
import { upload } from '../services/storage.service.js';

const router = express.Router();

// Only Instructors and Admins can manage tests
router.use(verifyToken);

router.get('/', requireRole(['instructor', 'admin', 'student']), listTests);
router.post('/', requireRole(['instructor', 'admin']), createTest);
router.get('/:id', requireRole(['instructor', 'admin', 'student']), getTestDetails); // Students might need to see details before starting
router.put('/:id', requireRole(['instructor', 'admin']), updateTest);
router.put('/:id/publish', requireRole(['instructor', 'admin']), publishTest);
router.delete('/:id', requireRole(['instructor', 'admin']), deleteTest);

router.post('/:test_id/blocks', requireRole(['instructor', 'admin']), addBlock);
router.put('/blocks/:block_id', requireRole(['instructor', 'admin']), updateBlock);
router.delete('/blocks/:block_id', requireRole(['instructor', 'admin']), deleteBlock);

router.post('/blocks/:block_id/questions', requireRole(['instructor', 'admin']), upload.fields([
    { name: 'reference_media', maxCount: 10 },
    { name: 'option_media', maxCount: 10 }
]), addQuestion);
router.put('/questions/:question_id', requireRole(['instructor', 'admin']), updateQuestion);
router.delete('/questions/:question_id', requireRole(['instructor', 'admin']), deleteQuestion);

export default router;
