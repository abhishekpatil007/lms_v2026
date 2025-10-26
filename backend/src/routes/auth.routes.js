import express from 'express';
import { login, refresh, logout, me, onboardUser, onboardInstructor, requestPasswordReset, resetPassword, changePassword } from '../controllers/auth.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = express.Router();

router.post('/onboard', verifyToken, requireRole(['admin']), onboardUser);
router.post('/onboard-instructor', verifyToken, requireRole(['admin']), onboardInstructor);
// router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);   
router.post('/logout', logout);
router.get('/me', verifyToken, me);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/change-password', verifyToken, changePassword);
export default router;
