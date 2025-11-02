// src/config/storage.config.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';

const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local'; // 'local' | 'aws'

// ---------------------------
// Local storage
// ---------------------------
const localStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.resolve(process.cwd(), 'uploads', 'documents');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, unique);
    },
});

// ---------------------------
// AWS S3 storage (v3)
// ---------------------------
let storageEngine;

if (STORAGE_TYPE === 'aws') {
    const { AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_REGION, AWS_BUCKET_NAME, AWS_ACL } = process.env;

    if (!AWS_ACCESS_KEY || !AWS_SECRET_KEY || !AWS_BUCKET_NAME) {
        console.warn('⚠️  AWS environment variables not set. Falling back to local storage.');
        storageEngine = localStorage;
    } else {
        const s3 = new S3Client({
            region: AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: AWS_ACCESS_KEY,
                secretAccessKey: AWS_SECRET_KEY,
            },
        });

        storageEngine = multerS3({
            s3,
            bucket: AWS_BUCKET_NAME,
            acl: AWS_ACL || 'private',
            metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
            key: (req, file, cb) => {
                const key = `documents/${Date.now()}-${file.originalname}`;
                cb(null, key);
            },
        });
    }
} else {
    storageEngine = localStorage;
}

// ---------------------------
// Export configured upload
// ---------------------------
const upload = multer({
    storage: storageEngine,
    limits: {
        fileSize: Number(process.env.MAX_FILE_SIZE || 50 * 1024 * 1024), // default 50MB
    },
});

export default upload;
export { STORAGE_TYPE };
