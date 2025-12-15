// src/controllers/invoice.controller.js
import db from '../models/index.js';
const { Invoice, User, Batch, BatchStudent } = db;
import { verifyWebhookSignature } from '../services/razorpay.service.js';
import { generateInvoicePDF } from '../services/invoice.service.js';
import sendWelcomeEmail from '../services/email.service.js';
import { handleOfflineEnrollment, handleOnlinePaymentRequest } from '../services/enrollment.service.js';
import { processInvoiceExcel, sendManualInvoice } from '../services/bulkInvoice.service.js';

// -------------------------------
// 1️⃣ Admin → Offline Enrollment
// -------------------------------
export const offlineEnroll = async (req, res) => {
    try {
        const result = await handleOfflineEnrollment(req.body);
        return res.status(201).json(result);
    } catch (err) {
        console.error('offlineEnroll Error:', err);
        return res.status(400).json({ message: err.message || 'Internal server error' });
    }
};

// -------------------------------------
// 2️⃣ Admin → Request Online Payment
// -------------------------------------
export const requestPayment = async (req, res) => {
    try {
        const result = await handleOnlinePaymentRequest(req.body);
        return res.status(201).json(result);
    } catch (err) {
        console.error('requestPayment Error:', err);
        return res.status(400).json({ message: err.message || 'Internal server error' });
    }
};

// ---------------------------------------
// 3️⃣ Razorpay → Payment Webhook Handler
// ---------------------------------------
export const handleWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-razorpay-signature'];
        const rawBody = JSON.stringify(req.body);

        const verified = verifyWebhookSignature(rawBody, signature);
        if (!verified) {
            return res.status(400).json({ message: 'Invalid signature' });
        }

        const event = req.body.event;
        if (event !== 'payment_link.paid') {
            return res.status(200).json({ message: 'Event ignored' });
        }

        const paymentLink = req.body.payload.payment_link.entity;
        const paymentId = paymentLink.id;
        const invoice = await Invoice.findOne({ where: { payment_id: paymentId } });
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        // mark paid
        invoice.status = 'paid';
        invoice.paid_at = new Date();
        await invoice.save();

        // enroll student
        await BatchStudent.create({ batch_id: invoice.batch_id, student_id: invoice.user_id });

        // generate PDF and email to student
        const student = await User.findByPk(invoice.user_id);
        const batch = await Batch.findByPk(invoice.batch_id);
        const pdfBuffer = await generateInvoicePDF({ invoice, student, batch });
        await sendWelcomeEmail({ to: student.email, name: student.name, invoiceBuffer: pdfBuffer });

        return res.status(200).json({ message: 'Invoice marked paid and student enrolled' });
    } catch (err) {
        console.error('handleWebhook', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
// -----------------------------
// 4️⃣ Admin: Bulk Invoice Upload
// -----------------------------
export const sendBulkInvoices = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Excel file required' });
        const filePath = req.file.path;

        const results = await processInvoiceExcel(filePath);
        return res.status(200).json({
            message: 'Bulk invoices processed successfully',
            summary: results,
        });
    } catch (err) {
        console.error('sendBulkInvoices', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// -----------------------------
// 5️⃣ Admin: Manual Invoice Send
// -----------------------------
export const sendManualInvoiceAPI = async (req, res) => {
    try {
        const result = await sendManualInvoice(req.body);
        return res.status(200).json(result);
    } catch (err) {
        console.error('sendManualInvoiceAPI', err);
        res.status(500).json({ message: err.message || 'Internal server error' });
    }
};

// -----------------------------
// 6️⃣ Admin: List Invoices
// -----------------------------
export const listInvoices = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search } = req.query;
        const offset = (page - 1) * limit;
        const where = {};

        if (status) where.status = status;
        // Search logic could be added here (e.g., search by invoice number or student name)
        // For simple search by invoice number:
        if (search) where.invoice_number = { [db.Sequelize.Op.like]: `%${search}%` };

        const { count, rows } = await Invoice.findAndCountAll({
            where,
            include: [
                { model: User, as: 'student', attributes: ['id', 'name', 'email'] },
                { model: Batch, as: 'batch', attributes: ['id', 'batch_name'] }
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });

        res.json({
            invoices: rows,
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('listInvoices Error:', error);
        res.status(500).json({ message: 'Error listing invoices', error: error.message });
    }
};

// -----------------------------
// 7️⃣ Admin: Get Invoice Details
// -----------------------------
export const getInvoiceDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const invoice = await Invoice.findByPk(id, {
            include: [
                { model: User, as: 'student', attributes: ['id', 'name', 'email', 'phone_number'] },
                { model: Batch, as: 'batch', attributes: ['id', 'batch_name', 'start_date', 'end_date'] }
            ]
        });

        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        res.json(invoice);
    } catch (error) {
        console.error('getInvoiceDetails Error:', error);
        res.status(500).json({ message: 'Error fetching invoice details', error: error.message });
    }
};