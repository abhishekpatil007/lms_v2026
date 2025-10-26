import crypto from 'crypto';

export function sha256Hex(val) {
    return crypto.createHash('sha256').update(val).digest('hex');
}
