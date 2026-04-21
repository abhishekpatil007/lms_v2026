// src/routes/invoice.routes.js
import express from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
    offlineEnroll,
    requestPayment,
    handleWebhook,
    sendBulkInvoices,
    sendManualInvoiceAPI,
    listInvoices,
    getInvoiceDetails,
    downloadInvoice,
    listSentInvoiceLogs,
    downloadSentLog,
    bulkDownloadSentLogs,
    getEmailModuleTemplate,
    sendEmailModuleBulk,
    getInvoicePreview
} from '../controllers/invoice.controller.js';
import multer from 'multer';
const router = express.Router();
const upload = multer({ dest: 'uploads/excel/' });

// Admin routes
router.post('/offline-enroll', verifyToken, requireRole(['admin']), offlineEnroll);
router.post('/request-payment', verifyToken, requireRole(['admin']), requestPayment);

// List Invoices
router.get('/', verifyToken, requireRole(['admin']), listInvoices);

// Sent Invoice Logs (Email Module)
router.get('/sent-logs', verifyToken, requireRole(['admin']), listSentInvoiceLogs);
router.get('/sent-logs/bulk-download', verifyToken, requireRole(['admin']), bulkDownloadSentLogs);
router.get('/sent-logs/:id/download', verifyToken, requireRole(['admin']), downloadSentLog);

// Download Invoice PDF
router.get('/:id/download', verifyToken, requireRole(['admin']), downloadInvoice);

// Get Invoice Details
router.get('/:id', verifyToken, requireRole(['admin']), getInvoiceDetails);

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

// --- Invoice Email Module ---
router.get(
    '/email-module/template',
    verifyToken,
    requireRole(['admin']),
    getEmailModuleTemplate
);

router.post(
    '/email-module/send',
    verifyToken,
    requireRole(['admin']),
    upload.single('file'),
    sendEmailModuleBulk
);

router.get(
    '/email-module/preview',
    verifyToken,
    requireRole(['admin']),
    getInvoicePreview
);

export default router;
