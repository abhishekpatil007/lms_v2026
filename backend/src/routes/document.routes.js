// src/routes/document.routes.js
import express from 'express';
import upload from '../config/storage.config.js';
import {
    uploadDocument,
    listDocuments,
    getDocument,
    downloadDocument,
    deleteDocument,
    getUniqueLanguages,
} from '../controllers/document.controller.js';
import { requireRole } from '../middleware/role.middleware.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get("/languages", getUniqueLanguages);

router.post(
    '/upload',
    verifyToken,
    requireRole(['instructor', 'admin']),
    upload.single('file'),
    uploadDocument
);

router.get('/', verifyToken, listDocuments);

router.get('/:id', verifyToken, getDocument);

router.get('/:id/download', verifyToken, downloadDocument);

router.delete('/:id',
    verifyToken,
    requireRole(['instructor', 'admin']),
    deleteDocument
);

export default router;
