// src/routes/invoice.routes.js
import express from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { offlineEnroll, requestPayment, handleWebhook, sendBulkInvoices, sendManualInvoiceAPI } from '../controllers/invoice.controller.js';
import multer from 'multer';
const router = express.Router();
const upload = multer({ dest: 'uploads/excel/' });

// Admin routes
router.post('/offline-enroll', verifyToken, requireRole(['admin']), offlineEnroll);
router.post('/request-payment', verifyToken, requireRole(['admin']), requestPayment);

// Razorpay webhook (no auth)
router.post('/payment-webhook', express.json({ type: '*/*' }), handleWebhook);

router.post(
    '/bulk-send',
    verifyToken,
    requireRole(['admin']),
    upload.single('file'),
    sendBulkInvoices
);

// Manual Single Invoice
router.post(
    '/manual-send',
    verifyToken,
    requireRole(['admin']),
    sendManualInvoiceAPI
);

export default router;
