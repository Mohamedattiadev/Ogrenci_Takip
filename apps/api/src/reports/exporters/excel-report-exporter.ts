import { Workbook } from 'exceljs';
import type { ReportExporter, ReportRow } from './report-exporter.interface';

export class ExcelReportExporter implements ReportExporter {
  contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  fileExtension = 'xlsx';

  async export(rows: ReportRow[], title: string): Promise<Buffer> {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet(title.slice(0, 31)); // Excel sheet adi 31 karakterle sinirli
    if (rows.length > 0) {
      const headers = Object.keys(rows[0]!);
      sheet.columns = headers.map((h) => ({ header: h, key: h, width: 20 }));
      sheet.getRow(1).font = { bold: true };
      rows.forEach((row) => sheet.addRow(row));
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
