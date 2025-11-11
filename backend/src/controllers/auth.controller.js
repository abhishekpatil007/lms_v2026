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
        if (existing) return res.status(409).json({ message: 'Email already exists' });

        const userPassword = password || Math.random().toString(36).slice(-8);
        const hash = await bcrypt.hash(userPassword, SALT_ROUNDS);

        const user = await User.create({ name, email, password_hash: hash, role, preferred_language });

        // Optionally return tokens
        const accessToken = signAccessToken({ userId: user.id, role: user.role });
        const refreshToken = signRefreshToken({ userId: user.id });
        await RefreshToken.create({ user_id: user.id, token_hash: sha256Hex(refreshToken), expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });

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
        console.error('onboardUser', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export async function onboardInstructor(req, res) {
    try {
        const { name, email, password, preferred_language = 'en' } = req.body;

        if (!name || !email) return res.status(400).json({ message: 'name and email required' });

        const existing = await User.findOne({ where: { email } });
        if (existing) return res.status(409).json({ message: 'Email already exists' });

        const instructorPassword = password || Math.random().toString(36).slice(-8);
        const hash = await bcrypt.hash(instructorPassword, SALT_ROUNDS);

        const instructor = await User.create({
            name,
            email,
            password_hash: hash,
            role: 'instructor',
            preferred_language
        });

        // Optionally create tokens
        const accessToken = signAccessToken({ userId: instructor.id, role: instructor.role });
        const refreshToken = signRefreshToken({ userId: instructor.id });
        await RefreshToken.create({
            user_id: instructor.id,
            token_hash: sha256Hex(refreshToken),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
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
        console.error('onboardInstructor', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'email,password required' });

        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

        const accessToken = signAccessToken({
            userId: user.id,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            role: user.role
        });
        const refreshToken = signRefreshToken({ userId: user.id });

        await RefreshToken.create({ user_id: user.id, token_hash: sha256Hex(refreshToken), expires_at: refreshTokenExpiryDate() });

        return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, tokens: { accessToken, refreshToken } });
    } catch (err) {
        console.error('login', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export async function refresh(req, res) {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });

        let payload;
        try { payload = verifyRefreshToken(refreshToken); } catch (e) { return res.status(401).json({ message: 'Invalid refresh token' }); }

        const tokenHash = sha256Hex(refreshToken);
        const stored = await RefreshToken.findOne({ where: { token_hash: tokenHash, revoked: false } });
        if (!stored) return res.status(401).json({ message: 'Refresh token revoked or not found' });
        if (new Date(stored.expires_at) < new Date()) return res.status(401).json({ message: 'Refresh token expired' });

        // rotate
        stored.revoked = true;
        await stored.save();

        const user = await User.findByPk(payload.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const newRefreshToken = signRefreshToken({ userId: payload.userId });
        await RefreshToken.create({ user_id: payload.userId, token_hash: sha256Hex(newRefreshToken), expires_at: refreshTokenExpiryDate() });

        const accessToken = signAccessToken({ userId: payload.userId, user: { id: user.id, name: user.name, email: user.email, role: user.role }, role: payload.role || 'student' });
        return res.json({ accessToken, refreshToken: newRefreshToken });
    } catch (err) {
        console.error('refresh', err);
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
        }
        return res.json({ message: 'Logged out' });
    } catch (err) {
        console.error('logout', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export async function me(req, res) {
    try {
        const user = await User.findByPk(req.user.userId, { attributes: ['id', 'name', 'email', 'role', 'preferred_language', 'is_active', 'created_at'] });
        if (!user) return res.status(404).json({ message: 'User not found' });
        return res.json({ user });
    } catch (err) {
        console.error('me', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export async function requestPasswordReset(req, res) {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email required' });

        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const token = crypto.randomBytes(32).toString('hex');
        user.reset_token = token;
        user.reset_token_expiry = new Date(Date.now() + 3600000); // 1 hour
        await user.save();

        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}&email=${email}`;
        if (sendEmail) {
            await sendPasswordResetEmail({ to: email, name: user.name, resetLink });
        }

        return res.json({ message: 'Password reset link sent to email', reset_link: resetLink });
        // return res.json({ message: 'Password reset link sent to email' });
    } catch (err) {
        console.error('requestPasswordReset', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export async function resetPassword(req, res) {
    try {
        const { email, token } = req.query;
        const { newPassword } = req.body;
        if (!email || !token || !newPassword) return res.status(400).json({ message: 'Email, token and newPassword required' });

        const user = await User.findOne({ where: { email, reset_token: token } });
        if (!user) return res.status(400).json({ message: 'Invalid token or email' });
        if (user.reset_token_expiry < new Date()) return res.status(400).json({ message: 'Token expired' });

        user.password_hash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_SALT_ROUNDS || '12'));
        user.reset_token = null;
        user.reset_token_expiry = null;
        await user.save();

        return res.json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error('resetPassword', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export async function changePassword(req, res) {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) return res.status(400).json({ message: 'oldPassword and newPassword required' });

        const user = await User.findByPk(req.user.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const match = await bcrypt.compare(oldPassword, user.password_hash);
        if (!match) return res.status(401).json({ message: 'Old password is incorrect' });

        user.password_hash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_SALT_ROUNDS || '12'));
        await user.save();

        return res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('changePassword', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

