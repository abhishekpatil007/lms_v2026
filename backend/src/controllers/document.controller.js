// src/controllers/document.controller.js
import path from 'path';
import fs from 'fs';
import { STORAGE_TYPE } from '../config/storage.config.js';
import db from '../models/index.js';
import dotenv from 'dotenv';
import documentLogger from '../utils/logger/individualLogger/documentLogger.js';
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
        if (!file) {
            documentLogger.warn('Upload Document - No file uploaded');
            return res.status(400).json({ message: 'No file uploaded' });
        }

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

        documentLogger.info(`Document uploaded successfully - Document ID: ${doc.id}, File: ${file.originalname}`);
        return res.status(201).json({ message: 'Uploaded', document: doc });
    } catch (err) {
        documentLogger.error(`Error in uploadDocument: ${err.message}`);
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

        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const { count, rows } = await Document.findAndCountAll({
            where: filters,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']],
        });

        documentLogger.info(`Documents listed - Count: ${rows.length}, Role: ${role}`);
        res.json({
            documents: rows,
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
        });
    } catch (err) {
        documentLogger.error(`Error in listDocuments: ${err.message}`);
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
        if (!doc) {
            documentLogger.warn(`Get Document - Document not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Document not found' });
        }

        // Global documents (no batch)
        if (!doc.batch_id) {
            documentLogger.info(`Document retrieved - Document ID: ${doc.id}`);
            return res.json(doc);
        }

        if (role === 'admin') {
            documentLogger.info(`Document retrieved by admin - Document ID: ${doc.id}`);
            return res.json(doc);
        }

        // Instructor → check if they own the batch
        if (role === 'instructor') {
            const ownsBatch = await db.Batch.findOne({
                where: { id: doc.batch_id, instructor_id: userId },
            });
            if (!ownsBatch) {
                documentLogger.warn(`Get Document - Access denied for instructor: ${userId}, Document: ${doc.id}`);
                return res.status(403).json({ message: 'Access denied (not your batch)' });
            }
            documentLogger.info(`Document retrieved by instructor - Document ID: ${doc.id}`);
            return res.json(doc);
        }

        // Student → check enrollment
        if (role === 'student') {
            const enrolled = await db.BatchStudent.findOne({
                where: { student_id: userId, batch_id: doc.batch_id },
            });
            if (!enrolled) {
                documentLogger.warn(`Get Document - Access denied for student: ${userId}, Document: ${doc.id}`);
                return res.status(403).json({ message: 'Access denied (not your batch)' });
            }
            documentLogger.info(`Document retrieved by student - Document ID: ${doc.id}`);
            return res.json(doc);
        }

        documentLogger.warn(`Get Document - Access denied for unknown role: ${role}`);
        res.status(403).json({ message: 'Access denied' });
    } catch (err) {
        documentLogger.error(`Error in getDocument: ${err.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};


// -------------------------------------------------------------------
// Download Document (with signed URL support)
// -------------------------------------------------------------------
export const downloadDocument = async (req, res) => {
    try {
        const doc = await Document.findByPk(req.params.id);
        if (!doc) {
            documentLogger.warn(`Download Document - Document not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Not found' });
        }

        const inline = req.query.inline === 'true';

        if (process.env.STORAGE_TYPE === 'aws' && s3) {
            if (!process.env.AWS_BUCKET_NAME) {
                documentLogger.error('Download Document - S3 not configured');
                return res.status(500).json({ message: 'S3 not configured' });
            }

            // Public URL
            if (doc.file_path && doc.file_path.startsWith('http')) {
                documentLogger.info(`Document downloaded from S3 - Document ID: ${doc.id}`);
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

            documentLogger.info(`Signed URL generated - Document ID: ${doc.id}`);
            return res.redirect(signedUrl);
        } else {
            // Local file handling
            const absolutePath = path.isAbsolute(doc.file_path)
                ? doc.file_path
                : path.join(process.cwd(), doc.file_path);

            if (!fs.existsSync(absolutePath)) {
                documentLogger.warn(`Download Document - File not found on server: ${absolutePath}`);
                return res.status(404).json({ message: 'File not found on server' });
            }

            const filename = doc.title || path.basename(absolutePath);
            const disposition = inline
                ? 'inline'
                : `attachment; filename="${filename}"`;

            documentLogger.info(`Local document downloaded - Document ID: ${doc.id}`);
            res.setHeader('Content-Disposition', disposition);
            return res.sendFile(absolutePath);
        }
    } catch (err) {
        documentLogger.error(`Error in downloadDocument: ${err.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// -------------------------------------------------------------------
// Delete Document
// -------------------------------------------------------------------
export const deleteDocument = async (req, res) => {
    try {
        const doc = await Document.findByPk(req.params.id);
        if (!doc) {
            documentLogger.warn(`Delete Document - Document not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Document not found' });
        }

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
                documentLogger.warn(`S3 delete warning: ${e.message || e}`);
            }
        }

        await doc.destroy();
        documentLogger.info(`Document deleted successfully - Document ID: ${doc.id}`);
        res.json({ message: 'Document deleted' });
    } catch (err) {
        documentLogger.error(`Error in deleteDocument: ${err.message}`);
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

        documentLogger.info(`Unique languages retrieved - Count: ${uniqueLanguages.length}`);
        res.status(200).json({
            success: true,
            count: uniqueLanguages.length,
            languages: uniqueLanguages,
        });
    } catch (error) {
        documentLogger.error(`Error in getUniqueLanguages: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Server error while fetching unique languages",
            error: error.message,
        });
    }
};
