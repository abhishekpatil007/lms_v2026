// src/services/razorpay.service.js
import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay Payment Link for an invoice.
 * @param {object} opts - { amount, customerName, customerEmail, invoiceNumber, description }
 * @returns {Promise<object>} Razorpay PaymentLink object
 */
export async function createPaymentLink({ amount, customerName, customerEmail, invoiceNumber, description }) {
    try {
        // Razorpay requires amount in paise (so multiply by 100)
        const paymentLink = await razorpay.paymentLink.create({
            amount: Math.round(amount * 100),
            currency: 'INR',
            accept_partial: false,
            description: description || `Invoice ${invoiceNumber}`,
            customer: {
                name: customerName,
                email: customerEmail,
            },
            notify: {
                sms: false,
                email: true,
            },
            reminder_enable: true
        });

        return paymentLink;
    } catch (error) {
        console.error('⚠️ Razorpay createPaymentLink Error:', error);
        throw new Error(
            'Failed to create Razorpay payment link'
        );
    }
}

/**
 * Verify Razorpay webhook signature
 * @param {string} body - raw request body string
 * @param {string} signature - razorpay signature header
 * @returns {boolean}
 */
export function verifyWebhookSignature(body, signature) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const expected = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

    return expected === signature;
}
