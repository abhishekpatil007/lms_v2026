import nodemailer from 'nodemailer';
import User from '../models/user.js';
import Course from '../models/course.js';
import Batch from '../models/batch.js';

// Configure transporter (SMTP credentials from .env)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const brandColor = '#7C3AED';
const brandName = 'Money Craft Trader';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

function emailWrapper(bodyHtml) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${brandName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f7;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

<!-- Header -->
<tr>
<td style="background:linear-gradient(135deg,${brandColor},#6D28D9);padding:32px 40px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">${brandName}</h1>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;font-weight:500;">Learning Management System</p>
</td>
</tr>

<!-- Body -->
<tr>
<td style="padding:36px 40px 40px;">
    ${bodyHtml}
</td>
</tr>

<!-- Footer -->
<tr>
<td style="padding:24px 40px;background-color:#fafafa;border-top:1px solid #f0f0f0;text-align:center;">
    <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
        This is an automated message from ${brandName}.<br/>
        Please do not reply to this email.
    </p>
</td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// --------------------------
// Send Welcome Email to Student (Batch Enrollment)
// --------------------------
export const sendWelcomeEmail = async (studentId, batchId) => {
    try {
        const student = await User.findByPk(studentId);
        const batch = await Batch.findByPk(batchId, { include: [{ model: Course, as: 'course' }] });

        if (!student || !batch) return;

        const firstName = student.name.split(' ')[0];
        const courseName = batch.course?.title || 'your course';

        const bodyHtml = `
        <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">You're enrolled, ${firstName}!</h2>
        <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
            You have been successfully enrolled in a new batch. Here are the details:
        </p>

        <!-- Batch Info Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
        <tr><td style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
            <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
            <tr>
                <td style="padding:8px 0;color:#9ca3af;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;" colspan="2">Enrollment Details</td>
            </tr>
            <tr>
                <td style="padding:6px 0;color:#6b7280;font-size:14px;font-weight:500;width:90px;">Batch</td>
                <td style="padding:6px 12px;color:#111827;font-size:14px;font-weight:600;">${batch.batch_name}</td>
            </tr>
            <tr>
                <td style="padding:6px 0;color:#6b7280;font-size:14px;font-weight:500;width:90px;">Course</td>
                <td style="padding:6px 12px;color:#111827;font-size:14px;font-weight:600;">${courseName}</td>
            </tr>
            <tr>
                <td style="padding:6px 0;color:#6b7280;font-size:14px;font-weight:500;width:90px;">Email</td>
                <td style="padding:6px 12px;color:#111827;font-size:14px;font-weight:600;">${student.email}</td>
            </tr>
            </table>
        </td></tr>
        </table>

        <!-- CTA Button -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
        <tr><td align="center">
            <a href="${frontendUrl}/login" style="display:inline-block;background:${brandColor};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 36px;border-radius:10px;">
                Start Learning &rarr;
            </a>
        </td></tr>
        </table>

        <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;text-align:center;">
            Log in with your existing credentials to access your classes and materials.
        </p>`;

        const mailOptions = {
            from: `"${brandName}" <${process.env.SMTP_USER}>`,
            to: student.email,
            subject: `You're enrolled in ${batch.batch_name} — ${brandName}`,
            html: emailWrapper(bodyHtml),
        };

        await transporter.sendMail(mailOptions);
        console.log(`Welcome email sent to student ${student.email}`);
    } catch (err) {
        console.error('sendWelcomeEmail error:', err);
    }
};

// --------------------------
// Notify Instructor
// --------------------------
export const notifyInstructor = async (batch, instructorId) => {
    try {
        const instructor = await User.findByPk(instructorId);
        const course = await Course.findByPk(batch.course_id);

        if (!instructor) return;

        const firstName = instructor.name.split(' ')[0];
        const courseName = course?.title || 'a course';

        const bodyHtml = `
        <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">New Batch Assignment</h2>
        <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
            Hi ${firstName}, you've been assigned as the instructor for a new batch.
        </p>

        <!-- Batch Info Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
        <tr><td style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
            <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
            <tr>
                <td style="padding:8px 0;color:#9ca3af;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;" colspan="2">Batch Details</td>
            </tr>
            <tr>
                <td style="padding:6px 0;color:#6b7280;font-size:14px;font-weight:500;width:90px;">Batch</td>
                <td style="padding:6px 12px;color:#111827;font-size:14px;font-weight:600;">${batch.batch_name}</td>
            </tr>
            <tr>
                <td style="padding:6px 0;color:#6b7280;font-size:14px;font-weight:500;width:90px;">Course</td>
                <td style="padding:6px 12px;color:#111827;font-size:14px;font-weight:600;">${courseName}</td>
            </tr>
            </table>
        </td></tr>
        </table>

        <!-- CTA Button -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
        <tr><td align="center">
            <a href="${frontendUrl}/login" style="display:inline-block;background:${brandColor};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 36px;border-radius:10px;">
                View Your Dashboard &rarr;
            </a>
        </td></tr>
        </table>

        <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;text-align:center;">
            Log in to your instructor dashboard to view and manage this batch.
        </p>`;

        const mailOptions = {
            from: `"${brandName}" <${process.env.SMTP_USER}>`,
            to: instructor.email,
            subject: `Batch Assignment: ${batch.batch_name} — ${brandName}`,
            html: emailWrapper(bodyHtml),
        };

        await transporter.sendMail(mailOptions);
        console.log(`Instructor notification sent to ${instructor.email}`);
    } catch (err) {
        console.error('notifyInstructor error:', err);
    }
};