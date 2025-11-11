// src/services/enrollment.service.js
import db from '../models/index.js';
import { generateInvoiceNumber, prepareInvoicePayload, generateInvoicePDF } from '../services/invoice.service.js';
// import { sendWelcomeEmail } from '../utils/email.utils.js';
import { createPaymentLink } from '../services/razorpay.service.js';

const { sequelize, User, Batch, BatchStudent, Invoice } = db;

/**
 * Check if a student is already enrolled in a batch
 */
export const checkEnrollment = async (batchId, studentId) => {
    return await BatchStudent.findOne({ where: { batch_id: batchId, student_id: studentId } });
};

/**
 * Validate student and batch existence
 */
export const validateEntities = async (studentId, batchId) => {
    const student = await User.findByPk(studentId);
    const batch = await Batch.findByPk(batchId);
    if (!student || !batch) throw new Error('Invalid student or batch');
    return { student, batch };
};

/**
 * Create and return a new invoice
 */
export const createInvoice = async ({
    student,
    batch,
    amount,
    gst_rate,
    is_gst_inclusive,
    payment_method,
    status,
    notes,
    transaction,
}) => {
    const invoiceNumber = await generateInvoiceNumber();

    const payload = prepareInvoicePayload({
        invoice_number: invoiceNumber,
        user_id: student.id,
        batch_id: batch.id,
        amount,
        gst_rate,
        is_gst_inclusive,
        payment_method,
        status,
        notes,
    });

    return await Invoice.create(payload, { transaction });
};

/**
 * Enroll student into batch
 */
export const enrollStudent = async (batchId, studentId, transaction) => {
    return await BatchStudent.create(
        { batch_id: batchId, student_id: studentId, enrolled_at: new Date() },
        { transaction }
    );
};

/**
 * Handle offline enrollment (full flow)
 */
export const handleOfflineEnrollment = async (data) => {
    const transaction = await sequelize.transaction();
    try {
        const { studentId, batchId, amount, is_gst_inclusive, gst_rate, notes } = data;

        const { student, batch } = await validateEntities(studentId, batchId);

        const alreadyEnrolled = await checkEnrollment(batch.id, student.id);
        if (alreadyEnrolled) throw new Error('Student is already enrolled in this batch.');

        const invoice = await createInvoice({
            student,
            batch,
            amount,
            gst_rate,
            is_gst_inclusive,
            payment_method: 'offline',
            status: 'paid',
            notes,
            transaction,
        });

        await enrollStudent(batch.id, student.id, transaction);

        const pdfBuffer = await generateInvoicePDF({ invoice, student, batch });
        // await sendWelcomeEmail({ to: student.email, name: student.name, invoiceBuffer: pdfBuffer });

        await transaction.commit();
        return { invoice, message: 'Student enrolled successfully (offline payment)' };

    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

/**
 * Handle online payment request (create Razorpay link)
 */
export const handleOnlinePaymentRequest = async (data) => {
    const transaction = await sequelize.transaction();
    try {
        const { studentId, batchId, amount, is_gst_inclusive, gst_rate, notes } = data;

        const { student, batch } = await validateEntities(studentId, batchId);

        const alreadyEnrolled = await checkEnrollment(batch.id, student.id);
        if (alreadyEnrolled) throw new Error('Student is already enrolled in this batch.');

        const invoice = await createInvoice({
            student,
            batch,
            amount,
            gst_rate,
            is_gst_inclusive,
            payment_method: 'online',
            status: 'pending',
            notes,
            transaction,
        });

        const paymentLink = await createPaymentLink({
            amount: invoice.total,
            customerName: student.name,
            customerEmail: student.email,
            invoiceNumber: invoice.invoice_number,
            description: `Batch: ${batch.batch_name}`,
        });

        invoice.payment_id = paymentLink.id;
        await invoice.save({ transaction });

        await transaction.commit();

        return {
            invoice,
            paymentLink: paymentLink.short_url,
            message: 'Payment link created successfully',
        };

    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};
