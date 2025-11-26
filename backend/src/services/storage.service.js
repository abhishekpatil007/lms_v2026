import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const isS3 = process.env.STORAGE_DRIVER === 's3';

let storage;

if (isS3) {
    const s3 = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    });

    storage = multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const ext = path.extname(file.originalname);
            cb(null, `uploads/${Date.now()}_${uuidv4()}${ext}`);
        }
    });
} else {
    // Local storage
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const ext = path.extname(file.originalname);
            cb(null, `${Date.now()}_${uuidv4()}${ext}`);
        }
    });
}

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, PNG and PDF are allowed.'), false);
    }
};

export const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: fileFilter
});

export const getFileUrl = (file) => {
    if (!file) return null;
    if (isS3) {
        return file.location;
    }
    return `/uploads/${file.filename}`;
};
