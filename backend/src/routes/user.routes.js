import express from 'express';
import { getAllInstructors, getAllStudents, updateUser, deleteUser } from '../controllers/user.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = express.Router();

router.get('/instructors', verifyToken, requireRole(['admin']), getAllInstructors);
router.get('/students', verifyToken, requireRole(['admin']), getAllStudents);
router.put('/:id', verifyToken, requireRole(['admin']), updateUser);
router.delete('/:id', verifyToken, requireRole(['admin']), deleteUser);

export default router;
