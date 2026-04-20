import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs-extra';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import db from '../models/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Mailer Setup ---
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const ASSETS_DIR = path.join(__dirname, '../assets');
const TEMP_DIR = path.resolve('uploads/temp_invoices');
fs.ensureDirSync(TEMP_DIR);

/**
 * Generates an Excel template with student details.
 */
export async function generateTemplate(type, students) {
    const columns = [
        "Name", "Email", 
        ...(type === 'partially_paid' ? 
            ["Receipt No", "Date", "Course Enrolled", "Batch", "Amount Paid", "Payment Method", "Transaction ID"] : 
            ["Invoice No", "Date", "Course Name", "Total", "Rate"]
        )
    ];

    const data = students.map(s => {
        const row = {
            "Name": s.name,
            "Email": s.email,
        };
        columns.slice(2).forEach(col => row[col] = "");
        return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
}

/**
 * Overlays text on Receipt template (Partially Paid)
 */
export async function generateReceiptPDF(data) {
    return new Promise((resolve) => {
        // Switch to Landscape for Receipt
        const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        const bgPath = path.join(ASSETS_DIR, 'partially_paid_mct.jpg');
        // A4 Landscape: 841.89 x 595.28 points
        doc.image(bgPath, 0, 0, { width: 841.89, height: 595.28 }); 

        doc.fillColor('black').font('Helvetica').fontSize(12);

        // Coordinates from user's working snippet
        doc.text(data["Receipt No"] || '-', 690, 60);
        doc.text(data["Date"] || '-', 655, 100);

        // Body fields
        doc.text(data["Name"] || '-', 175, 230);
        doc.text(data["Course Enrolled"] || 'No course assigned', 195, 266);
        doc.text(data["Batch"] || 'No batch assigned', 140, 302);
        doc.text("" + (data["Amount Paid"] || 0), 170, 342);
        doc.text(data["Payment Method"] || '-', 410, 380);
        doc.text(data["Transaction ID"] || '-', 200, 412);
        
        // Authorized Signatory (Optional coordinate from user)
        // doc.text("Money Craft Trader", 680, 475); 

        doc.end();
    });
}

/**
 * Helper to convert number to Indian words
 */
function numberToWords(num) {
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function toWords(n) {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
        if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + toWords(n % 100) : '');
        if (n < 100000) return toWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + toWords(n % 1000) : '');
        if (n < 10000000) return toWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + toWords(n % 100000) : '');
        return toWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + toWords(n % 10000000) : '');
    }

    const [integerPart, decimalPart] = num.toFixed(2).split('.');
    const integerWords = toWords(parseInt(integerPart));
    const decimalWords = decimalPart !== '00' ? toWords(parseInt(decimalPart)) + ' Paise' : '';

    let finalStr = "INR " + integerWords;
    if (decimalWords) finalStr += " and " + decimalWords;
    return finalStr + " Only";
}

/**
 * Overlays text on Tax Invoice template (Fully Paid)
 */
export async function generateTaxInvoicePDF(data) {
    return new Promise((resolve) => {
        const doc = new PDFDocument({ size: 'A4', margin: 0 });
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        const bgPath = path.join(ASSETS_DIR, 'fully_paid_mct.jpeg');
        doc.image(bgPath, 0, 0, { width: 595.28, height: 841.89 });

        doc.fillColor('black').font('Helvetica').fontSize(10);

        const getX = (px) => (px / 1131) * 595.28;
        const getY = (py) => (py / 1600) * 841.89;

        // Auto Calculations
        const grandTotal = parseFloat(data["Total"]) || 0;
        const gstRateTotal = parseFloat(data["Rate"] || "18") / 100 || 0.18;
        const taxableValue = grandTotal / (1 + gstRateTotal);
        const totalTax = grandTotal - taxableValue;
        const cgstAmount = totalTax / 2;
        const sgstAmount = totalTax / 2;
        const cgstRate = (gstRateTotal / 2 * 100).toFixed(1) + "%";

        const amountInWords = data["Amount_In_Words"] || numberToWords(grandTotal);

        // Header Section
        doc.text(data["Invoice No"] || '-', getX(580), getY(85));
        doc.text(data["Date"] || '-', getX(850), getY(85));

        // Buyer Section
        doc.fontSize(11).text(data["Name"] || '-', getX(200), getY(305));

        // Table Body
        doc.fontSize(10);
        doc.text("1.", getX(100), getY(450));
        doc.text(data["Course Name"] || 'Course Enrollment', getX(250), getY(450));
        doc.text("9992", getX(850), getY(450));
        doc.text(taxableValue.toFixed(2), getX(860), getY(450), { width: 80, align: 'right' });

        // GST Section (Middle-Bottom)  
        doc.text("GST", getX(500), getY(1040));
        doc.text(cgstRate  + ' CGST', getX(570), getY(1040));
        doc.text(cgstAmount.toFixed(2), getX(860), getY(1040), { width: 80, align: 'right' });
        doc.text(cgstRate + ' SGST/UTGST', getX(570), getY(1080));
        doc.text(sgstAmount.toFixed(2), getX(860), getY(1080), { width: 80, align: 'right' });

        // Total
        doc.fontSize(12).text(grandTotal.toFixed(2), getX(860), getY(1120), { width: 80, align: 'right' });

         // Amount in words
        doc.fontSize(10).text(amountInWords, getX(100), getY(1200), { width: 400 });


        // GST Table Total Line
        doc.font('Helvetica-Bold');
        doc.text("9992", getX(100), getY(1300));
        doc.text(taxableValue.toFixed(2), getX(410), getY(1300), { width: 80, align: 'right' });
        doc.text(cgstRate, getX(620), getY(1300));
        doc.text(cgstAmount.toFixed(2), getX(650), getY(1300), { width: 60, align: 'right' });
        doc.text(sgstAmount.toFixed(2), getX(810), getY(1300), { width: 60, align: 'right' });
        doc.text(cgstRate , getX(780), getY(1300));
        doc.text(totalTax.toFixed(2), getX(920), getY(1300), { width: 60, align: 'right' });

        // GST Table Total Line Next Row
        doc.text(taxableValue.toFixed(2), getX(410), getY(1330), { width: 80, align: 'right' });
        doc.text(cgstAmount.toFixed(2), getX(650), getY(1330), { width: 60, align: 'right' });
        doc.text(sgstAmount.toFixed(2), getX(810), getY(1330), { width: 60, align: 'right' });
        doc.text(totalTax.toFixed(2), getX(920), getY(1330), { width: 60, align: 'right' });

        // Final Total Amount Words (Tax Amount)
        doc.font('Helvetica-Bold').fontSize(9);
        const taxInWords = numberToWords(totalTax);
        doc.text(taxInWords, getX(200), getY(1360), { width: 450 });

        doc.end();
    });
}

/**
 * Sends one email with the generated PDF.
 */
async function sendSingleInvoiceEmail(email, name, pdfBuffer, type) {
    const subject = type === 'partially_paid' ? `Payment Receipt - Money Craft Trader` : `Tax Invoice - Money Craft Trader`;
    const filename = type === 'partially_paid' ? `Receipt_${name.replace(/\s+/g, '_')}.pdf` : `Invoice_${name.replace(/\s+/g, '_')}.pdf`;

    const mailOptions = {
        from: `"Money Craft Trader" <${process.env.SMTP_USER}>`,
        to: email,
        subject: subject,
        html: `
            <p>Dear ${name},</p>
            <p>Please find attached your ${type === 'partially_paid' ? 'payment receipt' : 'tax invoice'} for the course enrollment.</p>
            <p>Regards,<br>Team Money Craft Trader</p>
        `,
        attachments: [
            {
                filename: filename,
                content: pdfBuffer,
                contentType: 'application/pdf',
            },
        ],
    };

    await transporter.sendMail(mailOptions);
}

/**
 * Main function to process bulk emails.
 */
export async function processBulkEmails(type, filePath, onProgress) {
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    // raw: false ensures we get the formatted string from the cell
    let rawData = XLSX.utils.sheet_to_json(sheet, { raw: false });

    // Only consider rows that have an Invoice/Receipt number filled
    const data = rawData.filter(row => {
        const idField = type === 'partially_paid' ? "Receipt No" : "Invoice No";
        return row[idField] && String(row[idField]).trim() !== "";
    });

    let success = 0;
    let failed = 0;
    const total = data.length;

    for (let i = 0; i < total; i++) {
        const row = data[i];
        try {
            const pdfBuffer = type === 'partially_paid' ? 
                await generateReceiptPDF(row) : 
                await generateTaxInvoicePDF(row);
            
            await sendSingleInvoiceEmail(row.Email, row.Name, pdfBuffer, type);

            const idField = type === 'partially_paid' ? 'Receipt No' : 'Invoice No';
            const amountField = type === 'partially_paid' ? 'Amount Paid' : 'Total';
            await db.SentInvoiceLog.create({
                name: row.Name || '',
                email: row.Email || '',
                invoice_number: row[idField] || '',
                type,
                amount: parseFloat(row[amountField]) || null,
                sent_at: new Date(),
            }).catch(() => {}); // don't fail email send if log fails

            success++;
            if (onProgress) {
                onProgress({ 
                    current: i + 1, 
                    total, 
                    email: row.Email, 
                    name: row.Name,
                    status: 'success' 
                });
            }
        } catch (err) {
            console.error(`Failed to send email to ${row.Email}:`, err);
            failed++;
            if (onProgress) {
                onProgress({ 
                    current: i + 1, 
                    total, 
                    email: row.Email, 
                    name: row.Name,
                    status: 'failed',
                    error: err.message 
                });
            }
        }
    }

    return { total, success, failed };
}
