import PDFDocument from 'pdfkit';
import type { ReportExporter, ReportRow } from './report-exporter.interface';

export class PdfReportExporter implements ReportExporter {
  contentType = 'application/pdf';
  fileExtension = 'pdf';

  export(rows: ReportRow[], title: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).text(title, { align: 'center' });
      doc.moveDown();

      if (rows.length === 0) {
        doc.fontSize(11).text('Kayit bulunamadi.');
        doc.end();
        return;
      }

      const headers = Object.keys(rows[0]!);
      const colWidth = (doc.page.width - 80) / headers.length;

      doc.fontSize(10).font('Helvetica-Bold');
      headers.forEach((h, i) =>
        doc.text(h, 40 + i * colWidth, doc.y, { width: colWidth, continued: false }),
      );
      doc.moveDown(0.5);
      doc.font('Helvetica');

      rows.forEach((row) => {
        const y = doc.y;
        headers.forEach((h, i) => {
          doc.text(String(row[h] ?? ''), 40 + i * colWidth, y, { width: colWidth });
        });
        doc.moveDown(0.3);
        if (doc.y > doc.page.height - 60)
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
      });

      doc.end();
    });
  }
}
