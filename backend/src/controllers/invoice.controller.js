// src/controllers/invoice.controller.js
import db from '../models/index.js';
const { Invoice, User, Batch, BatchStudent } = db;
import { verifyWebhookSignature } from '../services/razorpay.service.js';
import { generateInvoicePDF } from '../services/invoice.service.js';
import sendWelcomeEmail from '../services/email.service.js';
import { handleOfflineEnrollment, handleOnlinePaymentRequest } from '../services/enrollment.service.js';
import { processInvoiceExcel, sendManualInvoice } from '../services/bulkInvoice.service.js';
import * as invoiceEmailService from '../services/invoiceEmail.service.js';

// -------------------------------
// 0️⃣ Invoice Email Module (NEW)
// -------------------------------
export const getEmailModuleTemplate = async (req, res) => {
    try {
        const { type } = req.query;
        if (!type) return res.status(400).json({ message: 'Type is required' });

        const students = await User.findAll({
            where: { role: 'student' },
            attributes: ['id', 'name', 'email'],
            order: [['name', 'ASC']]
        });

        const buffer = await invoiceEmailService.generateTemplate(type, students);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=template_${type}.xlsx`);
        return res.send(buffer);
    } catch (err) {
        console.error('getEmailModuleTemplate Error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const sendEmailModuleBulk = async (req, res) => {
    try {
        const { type } = req.body;
        if (!req.file) return res.status(400).json({ message: 'Excel file is required' });
        if (!type) return res.status(400).json({ message: 'Type is required' });

        const io = req.app.get('io');
        
        const result = await invoiceEmailService.processBulkEmails(type, req.file.path, (progress) => {
            if (io) {
                io.to('admin_invoices').emit('invoice_progress', progress);
            }
        });
        
        return res.status(200).json({
            message: 'Bulk emails processed',
            summary: result
        });
    } catch (err) {
        console.error('sendEmailModuleBulk Error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const getInvoicePreview = async (req, res) => {
    try {
        const { type } = req.query;
        if (!type) return res.status(400).json({ message: 'Type is required' });

        const sampleData = type === 'partially_paid' ? {
            "Receipt No": "SAMPLE-001",
            "Date": new Date().toLocaleDateString('en-GB'),
            "Name": "Sample Student",
            "Course Enrolled": "MCT Professional Course",
            "Batch": "Sample Batch",
            "Amount Paid": "10000",
            "Payment Method": "UPI",
            "Transaction ID": "TXNSAMPLE123"
        } : {
            "Invoice No": "INV-SAMPLE-001",
            "Date": new Date().toLocaleDateString('en-GB'),
            "Name": "Sample Student",
            "Course Name": "MCT Professional Course",
            "Amount": "8474.58",
            "CGST_Rate": "9%",
            "CGST_Amount": "762.71",
            "SGST_Rate": "9%",
            "SGST_Amount": "762.71",
            "Total": "10000.00",
            "Amount_In_Words": "Ten Thousand Rupees Only"
        };

        const buffer = type === 'partially_paid' ? 
            await invoiceEmailService.generateReceiptPDF(sampleData) : 
            await invoiceEmailService.generateTaxInvoicePDF(sampleData);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=preview_${type}.pdf`);
        return res.send(buffer);
    } catch (err) {
        console.error('getInvoicePreview Error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

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
// 7️⃣ Admin: Download Invoice PDF
// -----------------------------
export const downloadInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const invoice = await Invoice.findByPk(id, {
            include: [
                { model: User, as: 'student', attributes: ['id', 'name', 'email'] },
                { model: Batch, as: 'batch', attributes: ['id', 'batch_name'] }
            ]
        });

        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        const student = invoice.student;
        const batch = invoice.batch;
        const issueDate = new Date(invoice.issued_at || invoice.createdAt).toLocaleDateString('en-GB');

        let pdfBuffer;
        let filename;

        if (invoice.status === 'paid') {
            const data = {
                "Invoice No": invoice.invoice_number,
                "Date": issueDate,
                "Name": student?.name || '-',
                "Course Name": batch?.batch_name || 'Course Enrollment',
                "Total": String(parseFloat(invoice.total) || 0),
                "Rate": String(parseFloat(invoice.gst_rate) || 18),
            };
            pdfBuffer = await invoiceEmailService.generateTaxInvoicePDF(data);
            filename = `Invoice_${invoice.invoice_number}.pdf`;
        } else {
            const data = {
                "Receipt No": invoice.invoice_number,
                "Date": issueDate,
                "Name": student?.name || '-',
                "Course Enrolled": batch?.batch_name || 'Course Enrollment',
                "Batch": batch?.batch_name || '-',
                "Amount Paid": String(parseFloat(invoice.amount) || 0),
                "Payment Method": invoice.payment_method || '-',
                "Transaction ID": invoice.payment_id || '-',
            };
            pdfBuffer = await invoiceEmailService.generateReceiptPDF(data);
            filename = `Receipt_${invoice.invoice_number}.pdf`;
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(pdfBuffer);
    } catch (error) {
        console.error('downloadInvoice Error:', error);
        res.status(500).json({ message: 'Error generating invoice PDF', error: error.message });
    }
};

// -----------------------------
// 8️⃣ Admin: Get Invoice Details
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