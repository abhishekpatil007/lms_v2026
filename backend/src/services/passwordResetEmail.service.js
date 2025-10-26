import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendPasswordResetEmail({ to, name, resetLink }) {
    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
        to,
        subject: 'Password Reset Request',
        html: `
            <p>Hi ${name},</p>
            <p>You requested a password reset. Click the link below to set a new password:</p>
            <p><a href="${resetLink}" target="_blank">${resetLink}</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request this, please ignore this email.</p>
            <br/>
            <p>Thanks,<br/>${process.env.EMAIL_FROM_NAME}</p>
        `
    };

    await transporter.sendMail(mailOptions);
}

export default sendPasswordResetEmail;
