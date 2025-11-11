// src/services/invoiceHelper.js
import { calculateGST } from '../utils/tax.js';
import db from '../models/index.js';
import PDFDocument from 'pdfkit';
import getStream from 'get-stream';
const { Invoice } = db;

/**
 * prepareInvoicePayload
 * - computes gst_amount and total based on is_gst_inclusive and gst_rate
 * - returns the object you can pass direct to Invoice.create()
 */
export function prepareInvoicePayload({
    invoice_number,
    user_id,
    batch_id,
    amount,
    gst_rate = 18.0,
    is_gst_inclusive = true,
    payment_method = 'online',
    status = 'pending',
    notes = null,
}) {
    const { base, gst, total } = calculateGST(amount, gst_rate, is_gst_inclusive);

    return {
        invoice_number,
        user_id,
        batch_id,
        amount: Number(Number(amount).toFixed(2)), // the input amount (either base or total per flag)
        gst_rate: Number(gst_rate),
        is_gst_inclusive: !!is_gst_inclusive,
        gst_amount: gst,
        total,
        payment_method,
        status,
        notes,
    };
}

// helper: sequential invoice number
export async function generateInvoiceNumber() {
    const count = await Invoice.count();
    const year = new Date().getFullYear();
    return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
}

export async function generateInvoicePDF({ studentName, batchId, batchFee }) {
    const doc = new PDFDocument();
    doc.fontSize(18).text('LMS Portal Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Student: ${studentName}`);
    doc.text(`Batch ID: ${batchId}`);
    doc.text(`Amount: $${batchFee}`);
    doc.moveDown();
    doc.text('Thank you for enrolling in our course!', { align: 'center' });
    doc.end();

    const pdfBuffer = await getStream(doc, { encoding: 'buffer' });
    return pdfBuffer;
}