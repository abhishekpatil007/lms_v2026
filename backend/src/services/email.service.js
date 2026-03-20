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

export default async function sendWelcomeEmail({ to, name, password, invoiceBuffer, instructor = false }) {
    const htmlContent = instructor
        ? `<h2>Welcome, ${name}!</h2>
       <p>Your instructor account has been created. Here are your login credentials:</p>
       <ul><li>Email: ${to}</li><li>Password: ${password}</li></ul>
       <p>Login and start managing your classes!</p>`
        : `<h2>Welcome, ${name}!</h2>
       <p>Your account has been created. Here are your login credentials:</p>
       <ul><li>Email: ${to}</li><li>Password: ${password}</li></ul>
       <p>Please find attached your invoice for the batch fee.</p>`;

    const mailOptions = {
        from: `"LMS Portal" <${process.env.SMTP_USER}>`,
        to,
        subject: instructor ? 'Welcome Instructor' : 'Welcome to LMS Portal',
        html: htmlContent,
        // attachments: instructor
        //     ? []
        //     : [{ filename: 'invoice.pdf', content: invoiceBuffer }]
    };

    await transporter.sendMail(mailOptions);
}
