import nodemailer from 'nodemailer';

// Configure transporter (SMTP credentials from .env)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
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

export default async function sendWelcomeEmail({ to, name, password, instructor = false }) {
    const firstName = name.split(' ')[0];

    const studentBody = `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Welcome aboard, ${firstName}!</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
        Your learning account has been created and is ready to go. Use the credentials below to log in and start your journey.
    </p>

    <!-- Credentials Card -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
    <tr><td style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
        <p style="margin:0 0 4px;color:#9ca3af;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Your Login Credentials</p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:12px;">
        <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;font-weight:500;width:80px;">Email</td>
            <td style="padding:6px 12px;color:#111827;font-size:14px;font-weight:600;">${to}</td>
        </tr>
        <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;font-weight:500;width:80px;">Password</td>
            <td style="padding:6px 12px;">
                <code style="background-color:#ede9fe;color:${brandColor};padding:4px 12px;border-radius:6px;font-size:14px;font-weight:700;letter-spacing:0.5px;">${password}</code>
            </td>
        </tr>
        </table>
    </td></tr>
    </table>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
    <tr><td align="center">
        <a href="${frontendUrl}/login" style="display:inline-block;background:${brandColor};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 36px;border-radius:10px;">
            Log In to Your Account &rarr;
        </a>
    </td></tr>
    </table>

    <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;text-align:center;">
        For security, we recommend changing your password after your first login.
    </p>`;

    const instructorBody = `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Welcome, ${firstName}!</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
        Your instructor account has been created. You can now log in to manage your batches, classes, and students.
    </p>

    <!-- Credentials Card -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
    <tr><td style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
        <p style="margin:0 0 4px;color:#9ca3af;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Your Login Credentials</p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:12px;">
        <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;font-weight:500;width:80px;">Email</td>
            <td style="padding:6px 12px;color:#111827;font-size:14px;font-weight:600;">${to}</td>
        </tr>
        <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;font-weight:500;width:80px;">Password</td>
            <td style="padding:6px 12px;">
                <code style="background-color:#ede9fe;color:${brandColor};padding:4px 12px;border-radius:6px;font-size:14px;font-weight:700;letter-spacing:0.5px;">${password}</code>
            </td>
        </tr>
        </table>
    </td></tr>
    </table>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
    <tr><td align="center">
        <a href="${frontendUrl}/login" style="display:inline-block;background:${brandColor};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 36px;border-radius:10px;">
            Go to Instructor Dashboard &rarr;
        </a>
    </td></tr>
    </table>

    <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;text-align:center;">
        For security, we recommend changing your password after your first login.
    </p>`;

    const mailOptions = {
        from: `"${brandName}" <${process.env.SMTP_USER}>`,
        to,
        subject: instructor ? `Welcome to ${brandName} — Instructor Account` : `Welcome to ${brandName}`,
        html: emailWrapper(instructor ? instructorBody : studentBody),
    };

    await transporter.sendMail(mailOptions);
}