import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import User from '../models/user.js';
import RefreshToken from '../models/refreshToken.js';
import { sha256Hex } from '../utils/hash.js';
import sendWelcomeEmail from '../services/email.service.js';
import { generateInvoicePDF } from '../services/invoice.service.js';
import sendPasswordResetEmail from '../services/passwordResetEmail.service.js';
import crypto from 'crypto';
import { signAccessToken, signRefreshToken, verifyRefreshToken, refreshTokenExpiryDate } from '../utils/jwt.js';
import authLogger from '../utils/logger/individualLogger/authLogger.js';
import fs from 'fs-extra';
import XLSX from 'xlsx';

dotenv.config();

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 12);
const sendEmail = false;

// export async function register(req, res) {
//     try {
//         const { name, email, password, role = 'student', preferred_language = 'en' } = req.body;
//         if (!name || !email || !password) return res.status(400).json({ message: 'name,email,password required' });

//         const existing = await User.findOne({ where: { email } });
//         if (existing) return res.status(409).json({ message: 'Email already registered' });

//         const hash = await bcrypt.hash(password, SALT_ROUNDS);
//         const user = await User.create({ name, email, password_hash: hash, role, preferred_language });

//         const accessToken = signAccessToken({ userId: user.id, role: user.role });
//         const refreshToken = signRefreshToken({ userId: user.id });

//         await RefreshToken.create({ user_id: user.id, token_hash: sha256Hex(refreshToken), expires_at: refreshTokenExpiryDate() });

//         return res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, tokens: { accessToken, refreshToken } });
//     } catch (err) {
//         console.error('register', err);
//         return res.status(500).json({ message: 'Internal server error' });
//     }
// }

export async function onboardUser(req, res) {
    try {
        const { name, email, role = 'student', preferred_language = 'en', password, batchId, batchFee } = req.body;
        if (!name || !email || !role) return res.status(400).json({ message: 'name,email,role required' });

        const existing = await User.findOne({ where: { email } });
        if (existing) {
            authLogger.warn(`Onboard User - Email already exists: ${email}`);
            return res.status(409).json({ message: 'Email already exists' });
        }

        const userPassword = password || crypto.randomBytes(4).toString('hex'); // 8 chars
        const hash = await bcrypt.hash(userPassword, SALT_ROUNDS);

        const user = await User.create({ name, email, password_hash: hash, role, preferred_language });
        authLogger.info(`User onboarded successfully - User ID: ${user.id}, Email: ${email}, Role: ${role}`);

        // Optionally return tokens
        const accessToken = signAccessToken({ userId: user.id, role: user.role });
        const refreshToken = signRefreshToken({ userId: user.id });
        await RefreshToken.create({ user_id: user.id, token_hash: sha256Hex(refreshToken), expires_at: refreshTokenExpiryDate() });

        if (sendEmail) {
            const invoiceBuffer = await generateInvoicePDF({
                studentName: name,
                batchId,
                batchFee
            });

            await sendWelcomeEmail({
                to: email,
                name,
                password: userPassword,
                invoiceBuffer
            });
        }

        return res.status(201).json({
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            credentials: { password: userPassword },
            tokens: { accessToken, refreshToken }
        });
    } catch (err) {
        authLogger.error(`Error in onboardUser: ${err.message}`);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export async function onboardInstructor(req, res) {
    try {
        const { name, email, password, preferred_language = 'en' } = req.body;

        if (!name || !email) return res.status(400).json({ message: 'name and email required' });

        const existing = await User.findOne({ where: { email } });
        if (existing) {
            authLogger.warn(`Onboard Instructor - Email already exists: ${email}`);
            return res.status(409).json({ message: 'Email already exists' });
        }

        const instructorPassword = password || crypto.randomBytes(4).toString('hex');
        const hash = await bcrypt.hash(instructorPassword, SALT_ROUNDS);

        const instructor = await User.create({
            name,
            email,
            password_hash: hash,
            role: 'instructor',
            preferred_language
        });
        authLogger.info(`Instructor onboarded successfully - Instructor ID: ${instructor.id}, Email: ${email}`);

        // Optionally create tokens
        const accessToken = signAccessToken({ userId: instructor.id, role: instructor.role });
        const refreshToken = signRefreshToken({ userId: instructor.id });
        await RefreshToken.create({
            user_id: instructor.id,
            token_hash: sha256Hex(refreshToken),
            expires_at: refreshTokenExpiryDate()
        });

        if (sendEmail) {
            await sendWelcomeEmail({
                to: email,
                name,
                password: instructorPassword,
                instructor: true
            });
        }

        return res.status(201).json({
            user: { id: instructor.id, name: instructor.name, email: instructor.email, role: instructor.role },
            credentials: { password: instructorPassword },
            tokens: { accessToken, refreshToken }
        });
    } catch (err) {
        authLogger.error(`Error in onboardInstructor: ${err.message}`);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export async function bulkOnboardStudents(req, res) {
    try {
        if (!req.file) return res.status(400).json({ message: 'Excel file required' });
        
        const filePath = req.file.path;
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        const results = { successful: 0, failed: 0, details: [] };

        for (const student of data) {
            try {
                const { name, email, preferred_language = 'en' } = student;
                
                if (!name || !email) {
                    throw new Error('Name and email are required');
                }

                const existing = await User.findOne({ where: { email } });
                if (existing) {
                    throw new Error('Email already exists');
                }

                const userPassword = crypto.randomBytes(4).toString('hex');
                const hash = await bcrypt.hash(userPassword, SALT_ROUNDS);

                const user = await User.create({ name, email, password_hash: hash, role: 'student', preferred_language });
                authLogger.info(`Student bulk onboarded successfully - User ID: ${user.id}, Email: ${email}`);

                if (sendEmail) {
                    await sendWelcomeEmail({
                        to: email,
                        name,
                        password: userPassword,
                    });
                }
                
                results.successful++;
                results.details.push({ email, name, password: userPassword, status: 'success' });
            } catch (err) {
                authLogger.error(`Bulk onboard error for ${student.email}: ${err.message}`);
                results.failed++;
                results.details.push({ email: student.email, name: student.name, status: 'failed', error: err.message });
            }
        }
        
        // Cleanup file
        if (await fs.pathExists(filePath)) {
            await fs.unlink(filePath);
        }

        return res.status(200).json({ message: 'Bulk onboard processed', results });
    } catch (err) {
        authLogger.error(`Error in bulkOnboardStudents: ${err.message}`);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'email,password required' });

        const user = await User.findOne({ where: { email } });
        if (!user) {
            authLogger.warn(`Login attempt - User not found: ${email}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) {
            authLogger.warn(`Login attempt - Invalid password for user: ${email}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const accessToken = signAccessToken({
            userId: user.id,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            role: user.role
        });
        const refreshToken = signRefreshToken({ userId: user.id });

        await RefreshToken.create({ user_id: user.id, token_hash: sha256Hex(refreshToken), expires_at: refreshTokenExpiryDate() });
        authLogger.info(`User logged in successfully - User ID: ${user.id}, Email: ${email}, Role: ${user.role}`);

        return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, tokens: { accessToken, refreshToken } });
    } catch (err) {
        authLogger.error(`Error in login: ${err.message}`);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export async function refresh(req, res) {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });

        let payload;
        try { payload = verifyRefreshToken(refreshToken); } catch (e) {
            authLogger.warn(`Refresh token - Invalid refresh token`);
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        const tokenHash = sha256Hex(refreshToken);
        const stored = await RefreshToken.findOne({ where: { token_hash: tokenHash, revoked: false } });
        if (!stored) {
            authLogger.warn(`Refresh token - Token revoked or not found for User ID: ${payload.userId}`);
            return res.status(401).json({ message: 'Refresh token revoked or not found' });
        }
        if (new Date(stored.expires_at) < new Date()) {
            authLogger.warn(`Refresh token - Token expired for User ID: ${payload.userId}`);
            return res.status(401).json({ message: 'Refresh token expired' });
        }

        // rotate
        stored.revoked = true;
        await stored.save();

        const user = await User.findByPk(payload.userId);
        if (!user) {
            authLogger.error(`Refresh token - User not found: ${payload.userId}`);
            return res.status(404).json({ message: 'User not found' });
        }

        const newRefreshToken = signRefreshToken({ userId: payload.userId });
        await RefreshToken.create({ user_id: payload.userId, token_hash: sha256Hex(newRefreshToken), expires_at: refreshTokenExpiryDate() });

        const accessToken = signAccessToken({ 
            userId: user.id, 
            user: { id: user.id, name: user.name, email: user.email, role: user.role }, 
            role: user.role 
        });
        authLogger.info(`Token refreshed successfully - User ID: ${payload.userId}, Role: ${user.role}`);
        return res.json({ accessToken, refreshToken: newRefreshToken });
    } catch (err) {
        authLogger.error(`Error in refresh: ${err.message}`);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export async function logout(req, res) {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });
        const tokenHash = sha256Hex(refreshToken);
        const stored = await RefreshToken.findOne({ where: { token_hash: tokenHash } });
        if (stored) {
            stored.revoked = true;
            await stored.save();
            authLogger.info(`User logged out successfully - User ID: ${stored.user_id}`);
        }
        return res.json({ message: 'Logged out' });
    } catch (err) {
        authLogger.error(`Error in logout: ${err.message}`);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export async function me(req, res) {
    try {
        const user = await User.findByPk(req.user.userId, { attributes: ['id', 'name', 'email', 'role', 'preferred_language', 'is_active', 'created_at'] });
        if (!user) {
            authLogger.error(`Me endpoint - User not found: ${req.user.userId}`);
            return res.status(404).json({ message: 'User not found' });
        }
        authLogger.info(`Me endpoint accessed - User ID: ${user.id}`);
        return res.json({ user });
    } catch (err) {
        authLogger.error(`Error in me: ${err.message}`);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export async function requestPasswordReset(req, res) {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email required' });

        const user = await User.findOne({ where: { email } });
        if (!user) {
            authLogger.warn(`Password reset request - User not found: ${email}`);
            return res.status(404).json({ message: 'User not found' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        user.reset_token = token;
        user.reset_token_expiry = new Date(Date.now() + 3600000); // 1 hour
        await user.save();
        authLogger.info(`Password reset token generated - User ID: ${user.id}, Email: ${email}`);

        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}&email=${email}`;
        if (sendEmail) {
            await sendPasswordResetEmail({ to: email, name: user.name, resetLink });
        }

        return res.json({ message: 'Password reset link sent to email' });
    } catch (err) {
        authLogger.error(`Error in requestPasswordReset: ${err.message}`);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export async function resetPassword(req, res) {
    try {
        const { email, token } = req.query;
        const { newPassword } = req.body;
        if (!email || !token || !newPassword) return res.status(400).json({ message: 'Email, token and newPassword required' });

        const user = await User.findOne({ where: { email, reset_token: token } });
        if (!user) {
            authLogger.warn(`Password reset - Invalid token or email: ${email}`);
            return res.status(400).json({ message: 'Invalid token or email' });
        }
        if (user.reset_token_expiry < new Date()) {
            authLogger.warn(`Password reset - Token expired for user: ${email}`);
            return res.status(400).json({ message: 'Token expired' });
        }

        user.password_hash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_SALT_ROUNDS || '12'));
        user.reset_token = null;
        user.reset_token_expiry = null;
        await user.save();
        authLogger.info(`Password reset successfully - User ID: ${user.id}, Email: ${email}`);

        return res.json({ message: 'Password reset successfully' });
    } catch (err) {
        authLogger.error(`Error in resetPassword: ${err.message}`);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export async function changePassword(req, res) {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) return res.status(400).json({ message: 'oldPassword and newPassword required' });

        const user = await User.findByPk(req.user.userId);
        if (!user) {
            authLogger.error(`Change password - User not found: ${req.user.userId}`);
            return res.status(404).json({ message: 'User not found' });
        }

        const match = await bcrypt.compare(oldPassword, user.password_hash);
        if (!match) {
            authLogger.warn(`Change password - Invalid old password for user: ${user.id}`);
            return res.status(401).json({ message: 'Old password is incorrect' });
        }

        user.password_hash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_SALT_ROUNDS || '12'));
        await user.save();
        authLogger.info(`Password changed successfully - User ID: ${user.id}`);

        return res.json({ message: 'Password changed successfully' });
    } catch (err) {
        authLogger.error(`Error in changePassword: ${err.message}`);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

