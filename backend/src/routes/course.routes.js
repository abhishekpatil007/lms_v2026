// src/routes/course.routes.js
import express from 'express';
import {
    createCourse,
    updateCourse,
    listCourses,
    getCourseById,
    deactivateCourse
} from '../controllers/course.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = express.Router();

// Admin only routes
router.post('/', verifyToken, requireRole(['admin']), createCourse);
router.put('/:id', verifyToken, requireRole(['admin']), updateCourse);
router.patch('/:id/deactivate', verifyToken, requireRole(['admin']), deactivateCourse);

// Public or Authenticated
router.get('/', verifyToken, listCourses);
router.get('/:id', verifyToken, getCourseById);

export default router;
