import jwt from 'jsonwebtoken';
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
export function verifySocketToken(token) {
    return jwt.verify(token, ACCESS_SECRET);
}
