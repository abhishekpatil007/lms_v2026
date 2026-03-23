import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function sendPasswordResetEmail({ to, name, resetLink }) {
    const mailOptions = {
        from: `"Money Craft Trader" <${process.env.SMTP_USER}>`,
        to,
        subject: 'Password Reset Request',
        html: `
            <p>Hi ${name},</p>
            <p>You requested a password reset. Click the link below to set a new password:</p>
            <p><a href="${resetLink}" target="_blank">${resetLink}</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request this, please ignore this email.</p>
            <br/>
            <p>Thanks,<br/>Money Craft Trader</p>
        `
    };

    await transporter.sendMail(mailOptions);
}

export default sendPasswordResetEmail;
