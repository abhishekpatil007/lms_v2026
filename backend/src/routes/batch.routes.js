// src/routes/batch.routes.js
import express from 'express';
import {
    createBatch,
    updateBatch,
    listBatches,
    getBatchById,
    deactivateBatch,
    assignInstructor,
    enrollStudents,
    getInstructorBatches,
    getStudentBatches,
    getBatchStudents,
} from '../controllers/batch.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = express.Router();

// --------------------------
// Admin Routes
// --------------------------
router.post('/', verifyToken, requireRole(['admin']), createBatch);
router.put('/:id', verifyToken, requireRole(['admin']), updateBatch); 
router.get('/', verifyToken, requireRole(['admin', 'instructor']), listBatches);
router.get('/:id', verifyToken, requireRole(['admin', 'instructor', 'student']), getBatchById);
router.get('/:id/students', verifyToken, requireRole(['admin', 'instructor']), getBatchStudents);
router.patch('/:id/deactivate', verifyToken, requireRole(['admin']), deactivateBatch);
router.patch('/:id/assign-instructor', verifyToken, requireRole(['admin']), assignInstructor);
router.post('/:id/enroll', verifyToken, requireRole(['admin']), enrollStudents);

// --------------------------
// Instructor Routes
// --------------------------
router.get('/instructor/my-batches', verifyToken, requireRole(['instructor']), getInstructorBatches);

// --------------------------
// Student Routes
// --------------------------
router.get('/student/my-batches', verifyToken, requireRole(['student']), getStudentBatches);

export default router;
