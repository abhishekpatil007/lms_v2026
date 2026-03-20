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

// --------------------------
// Send Welcome Email to Student
// --------------------------
export const sendWelcomeEmail = async (studentId, batchId) => {
    try {
        const student = await User.findByPk(studentId);
        const batch = await Batch.findByPk(batchId, { include: [{ model: Course, as: 'course' }] });

        if (!student || !batch) return;

        const mailOptions = {
            from: `"LMS Admin" <${process.env.SMTP_USER}>`,
            to: student.email,
            subject: `Welcome to Batch: ${batch.batch_name}`,
            html: `
        <h2>Hello ${student.name},</h2>
        <p>You have been successfully enrolled in the batch <strong>${batch.batch_name}</strong> for course <strong>${batch.course.title}</strong>.</p>
        <p>Your login credentials are:</p>
        <ul>
            <li>Email: ${student.email}</li>
            <li>Password: (use your existing password or reset link)</li>
        </ul>
        <p>Please log in to access the classes and materials.</p>
        <p>Happy Learning!</p>
        `,
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

        const mailOptions = {
            from: `"LMS Admin" <${process.env.SMTP_USER}>`,
            to: instructor.email,
            subject: `You have been assigned to a batch: ${batch.batch_name}`,
            html: `
        <h2>Hello ${instructor.name},</h2>
        <p>You have been assigned as the instructor for batch <strong>${batch.batch_name}</strong> under course <strong>${course?.title || ''}</strong>.</p>
        <p>Please log in to your instructor dashboard to view and manage this batch.</p>
        <p>Best regards,<br/>LMS Admin</p>
      `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Instructor notification sent to ${instructor.email}`);
    } catch (err) {
        console.error('notifyInstructor error:', err);
    }
};
