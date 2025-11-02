// src/controllers/document.controller.js
import path from 'path';
import fs from 'fs';
import { STORAGE_TYPE } from '../config/storage.config.js';
import db from '../models/index.js';
import dotenv from 'dotenv';
import {
    S3Client,
    DeleteObjectCommand,
    GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Op } from "sequelize";

dotenv.config();

const Document = db.Document;

// Initialize S3 client once
let s3 = null;
if (process.env.STORAGE_TYPE === 'aws') {
    s3 = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY,
            secretAccessKey: process.env.AWS_SECRET_KEY,
        },
    });
}

// -------------------------------------------------------------------
// Upload Document
// -------------------------------------------------------------------
export const uploadDocument = async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });

        const filePath = file.location || file.path;
        const fileType = path.extname(file.originalname).replace('.', '');

        const doc = await Document.create({
            title: req.body.title || file.originalname,
            description: req.body.description || null,
            file_path: filePath,
            file_type: fileType,
            language: req.body.language || null,
            batch_id: req.body.batch_id || null,
            uploaded_by: req.user?.user?.id,
            visibility: req.body.visibility || 'batch',
            is_active: true,
        });

        return res.status(201).json({ message: 'Uploaded', document: doc });
    } catch (err) {
        console.error('uploadDocument error', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// -------------------------------------------------------------------
// List Documents
// -------------------------------------------------------------------
export const listDocuments = async (req, res) => {
    try {
        const filters = {};
        const role = req.user?.role;
        const userId = req.user?.user?.id;

        if (req.query.language) filters.language = req.query.language;
        if (req.query.visibility) filters.visibility = req.query.visibility;

        // Role-based batch restriction
        if (role === 'instructor') {
            // Instructor: only their batches
            const instructorBatches = await db.Batch.findAll({
                where: { instructor_id: userId },
                attributes: ['id'],
                raw: true,
            });
            const batchIds = instructorBatches.map(b => b.id);
            filters.batch_id = { [Op.or]: [null, { [Op.in]: batchIds }] };

        } else if (role === 'student') {
            // Student: only batches they're enrolled in
            const enrolled = await db.BatchStudent.findAll({
                where: { student_id: userId },
                attributes: ['batch_id'],
                raw: true,
            });
            const batchIds = enrolled.map(b => b.batch_id);
            filters.batch_id = { [Op.or]: [null, { [Op.in]: batchIds }] };
        }

        const docs = await Document.findAll({
            where: filters,
            order: [['created_at', 'DESC']],
        });

        res.json(docs);
    } catch (err) {
        console.error('Error listing documents:', err);
        res.status(500).json({ message: 'Server error' });
    }
};


// -------------------------------------------------------------------
// Get Document
// -------------------------------------------------------------------
export const getDocument = async (req, res) => {
    try {
        const role = req.user?.role;
        const userId = req.user?.id;

        const doc = await Document.findByPk(req.params.id);
        if (!doc) return res.status(404).json({ message: 'Document not found' });

        // Global documents (no batch)
        if (!doc.batch_id) return res.json(doc);

        if (role === 'admin') return res.json(doc);

        // Instructor → check if they own the batch
        if (role === 'instructor') {
            const ownsBatch = await db.Batch.findOne({
                where: { id: doc.batch_id, instructor_id: userId },
            });
            if (!ownsBatch) return res.status(403).json({ message: 'Access denied (not your batch)' });
            return res.json(doc);
        }

        // Student → check enrollment
        if (role === 'student') {
            const enrolled = await db.BatchStudent.findOne({
                where: { student_id: userId, batch_id: doc.batch_id },
            });
            if (!enrolled) return res.status(403).json({ message: 'Access denied (not your batch)' });
            return res.json(doc);
        }

        res.status(403).json({ message: 'Access denied' });
    } catch (err) {
        console.error('Error getting document:', err);
        res.status(500).json({ message: 'Server error' });
    }
};


// -------------------------------------------------------------------
// Download Document (with signed URL support)
// -------------------------------------------------------------------
export const downloadDocument = async (req, res) => {
    try {
        const doc = await Document.findByPk(req.params.id);
        if (!doc) return res.status(404).json({ message: 'Not found' });

        const inline = req.query.inline === 'true';

        if (process.env.STORAGE_TYPE === 'aws' && s3) {
            if (!process.env.AWS_BUCKET_NAME) {
                return res.status(500).json({ message: 'S3 not configured' });
            }

            // Public URL
            if (doc.file_path && doc.file_path.startsWith('http')) {
                if (inline) return res.redirect(doc.file_path);
                res.setHeader(
                    'Content-Disposition',
                    `attachment; filename="${doc.title || 'file'}"`
                );
                return res.redirect(doc.file_path);
            }

            // Generate signed URL (v3)
            const Key = doc.file_path.replace(/^https?:\/\/.*?\/?/, '');
            const command = new GetObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key,
                ResponseContentDisposition: inline
                    ? 'inline'
                    : `attachment; filename="${doc.title}"`,
            });

            const signedUrl = await getSignedUrl(s3, command, {
                expiresIn: Number(process.env.SIGNED_URL_EXPIRES || 60),
            });

            return res.redirect(signedUrl);
        } else {
            // Local file handling
            const absolutePath = path.isAbsolute(doc.file_path)
                ? doc.file_path
                : path.join(process.cwd(), doc.file_path);

            if (!fs.existsSync(absolutePath)) {
                return res.status(404).json({ message: 'File not found on server' });
            }

            const filename = doc.title || path.basename(absolutePath);
            const disposition = inline
                ? 'inline'
                : `attachment; filename="${filename}"`;

            res.setHeader('Content-Disposition', disposition);
            return res.sendFile(absolutePath);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// -------------------------------------------------------------------
// Delete Document
// -------------------------------------------------------------------
export const deleteDocument = async (req, res) => {
    try {
        const doc = await Document.findByPk(req.params.id);
        if (!doc) return res.status(404).json({ message: 'Document not found' });

        if (process.env.STORAGE_TYPE !== 'aws') {
            // Local deletion
            const absolutePath = path.isAbsolute(doc.file_path)
                ? doc.file_path
                : path.join(process.cwd(), doc.file_path);
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
            }
        } else if (s3) {
            // Delete from S3
            const Key = doc.file_path.replace(/^https?:\/\/.*?\/?/, '');
            const command = new DeleteObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key,
            });
            try {
                await s3.send(command);
            } catch (e) {
                console.warn('S3 delete warning:', e.message || e);
            }
        }

        await doc.destroy();
        res.json({ message: 'Document deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// -------------------------------------------------------------------
// Get Lanugaes of Document
// -------------------------------------------------------------------
export const getUniqueLanguages = async (req, res) => {
    try {
        const languages = await Document.findAll({
            attributes: [
                [Document.sequelize.fn("DISTINCT", Document.sequelize.col("language")), "language"],
            ],
            where: {
                language: {
                    [Op.ne]: null,
                },
            },
            raw: true,
        });

        const uniqueLanguages = languages
            .map(l => l.language)
            .filter(Boolean)
            .sort();

        res.status(200).json({
            success: true,
            count: uniqueLanguages.length,
            languages: uniqueLanguages,
        });
    } catch (error) {
        console.error("Error fetching unique languages:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching unique languages",
            error: error.message,
        });
    }
};
