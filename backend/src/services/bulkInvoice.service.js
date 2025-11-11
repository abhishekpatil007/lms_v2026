// src/services/bulkInvoice.service.js
import fs from 'fs-extra';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import path from 'path';

// --- CONFIG ---
const AUTHORIZED_SIGNATORY = 'Money Craft Traders LMS';
const STORAGE_DIR = path.resolve('uploads/invoices');
fs.ensureDirSync(STORAGE_DIR);

// --- Mailer Setup ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// --- Helper: Generate PDF ---
async function generateInvoicePDF(student) {
    const doc = new PDFDocument({ margin: 40 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => { });

    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
    const issueDate = new Date().toLocaleDateString();

    // Header
    doc.fontSize(20).text('Money Craft Traders LMS', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).text(`Invoice Number: ${invoiceNo}`);
    doc.text(`Date: ${issueDate}`);
    doc.moveDown(1);

    doc.fontSize(12).text(`Student Name: ${student.fullName}`);
    doc.text(`Email: ${student.email}`);
    doc.text(`Course: ${student.courseName || 'N/A'}`);
    doc.text(`Batch: ${student.batchName || 'N/A'}`);
    doc.text(`Amount: ₹${student.amount}`);
    doc.text(`Payment Method: ${student.method || 'Offline'}`);
    doc.text(`Transaction ID: ${student.transactionId || '-'}`);
    doc.moveDown(1);

    doc.fontSize(10).text('Thank you for your payment!', { align: 'center' });
    doc.moveDown(1);
    doc.text(`Authorized By: ${AUTHORIZED_SIGNATORY}`, { align: 'right' });
    doc.end();

    const pdfBuffer = await new Promise((resolve) => {
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const filePath = path.join(STORAGE_DIR, `${invoiceNo}_${student.email}.pdf`);
    fs.writeFileSync(filePath, pdfBuffer);

    return { invoiceNo, pdfBuffer, filePath };
}

// --- Helper: Send Email ---
async function sendInvoiceEmail(student, invoiceNo, pdfBuffer) {
    const mailOptions = {
        from: `"Money Craft Traders LMS" <${process.env.SMTP_USER}>`,
        to: student.email,
        subject: `🧾 Invoice ${invoiceNo} - Money Craft Traders`,
        html: `
        <p>Hi <b>${student.fullName}</b>,</p>
        <p>Thank you for your payment for the course <b>${student.courseName}</b>.</p>
        <p>Your invoice number is <b>${invoiceNo}</b>. Please find the attached PDF invoice.</p>
        <p>Regards,<br>Money Craft Traders LMS</p>
    `,
        attachments: [
            {
                filename: `${invoiceNo}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
            },
        ],
    };

    await transporter.sendMail(mailOptions);
}

// --- Main: Process Excel File ---
export async function processInvoiceExcel(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const results = [];
    for (const student of data) {
        try {
            // const { invoiceNo, pdfBuffer } = await generateInvoicePDF(student);
            // await sendInvoiceEmail(student, invoiceNo, pdfBuffer);
            results.push({ email: student.email, status: 'sent', invoiceNo });
        } catch (err) {
            console.error(`❌ Error for ${student.email}:`, err.message);
            results.push({ email: student.email, status: 'failed', error: err.message });
        }
    }
    return results;
}

// --- Manual Send ---
export async function sendManualInvoice(studentData) {
    const { invoiceNo, pdfBuffer } = await generateInvoicePDF(studentData);
    // await sendInvoiceEmail(studentData, invoiceNo, pdfBuffer);
    return { message: 'Invoice sent successfully', invoiceNo };
}
