// src/routes/batch.routes.js
import express from 'express';
import {
    createBatch,
    updateBatch,
    listBatches,
    getBatchById,
    deactivateBatch,
    deleteBatch,
    assignInstructor,
    enrollStudents,
    unenrollStudent,
    reorderBatchVideos,
    getInstructorBatches,
    getStudentBatches,
    getBatchStudents,
    exportStudentsToExcel,
    bulkEnrollStudentsFromExcel,
} from '../controllers/batch.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import multer from 'multer';

const upload = multer({ dest: 'uploads/excel/' });

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
router.delete('/:id', verifyToken, requireRole(['admin']), deleteBatch);
router.patch('/:id/assign-instructor', verifyToken, requireRole(['admin']), assignInstructor);
router.post('/:id/enroll', verifyToken, requireRole(['admin']), enrollStudents);
router.delete('/:id/students/:studentId', verifyToken, requireRole(['admin']), unenrollStudent);
router.put('/:id/videos/reorder', verifyToken, requireRole(['admin', 'instructor']), reorderBatchVideos);
router.get('/:id/students/export', verifyToken, requireRole(['admin', 'instructor']), exportStudentsToExcel);
router.post('/:id/students/bulk-enroll', verifyToken, requireRole(['admin']), upload.single('file'), bulkEnrollStudentsFromExcel);

// --------------------------
// Instructor Routes
// --------------------------
router.get('/instructor/my-batches', verifyToken, requireRole(['instructor']), getInstructorBatches);

// --------------------------
// Student Routes
// --------------------------
router.get('/student/my-batches', verifyToken, requireRole(['student']), getStudentBatches);

export default router;
