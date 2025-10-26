import PDFDocument from 'pdfkit';
import getStream from 'get-stream';

export default async function generateInvoicePDF({ studentName, batchId, batchFee }) {
    const doc = new PDFDocument();
    doc.fontSize(18).text('LMS Portal Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Student: ${studentName}`);
    doc.text(`Batch ID: ${batchId}`);
    doc.text(`Amount: $${batchFee}`);
    doc.moveDown();
    doc.text('Thank you for enrolling in our course!', { align: 'center' });
    doc.end();

    return Buffer.from(await getStream.buffer(doc));
}
