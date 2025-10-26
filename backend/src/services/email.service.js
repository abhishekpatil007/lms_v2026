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
        attachments: instructor
            ? []
            : [{ filename: 'invoice.pdf', content: invoiceBuffer }]
    };

    await transporter.sendMail(mailOptions);
}
