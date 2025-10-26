import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '15m';
const REFRESH_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '30', 10);

export function signAccessToken(payload) {
    return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}
export function verifyAccessToken(token) { return jwt.verify(token, ACCESS_SECRET); }
export function signRefreshToken(payload) { return jwt.sign(payload, REFRESH_SECRET, { expiresIn: `${REFRESH_DAYS}d` }); }
export function verifyRefreshToken(token) { return jwt.verify(token, REFRESH_SECRET); }
export function refreshTokenExpiryDate() { return new Date(Date.now() + REFRESH_DAYS * 24 * 3600 * 1000); }
