import type { ReportExporter, ReportRow } from './report-exporter.interface';

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** Hafif, bagimliliksiz CSV uretici - format eklemek Factory'ye yeni bir sinif eklemek demek. */
export class CsvReportExporter implements ReportExporter {
  contentType = 'text/csv; charset=utf-8';
  fileExtension = 'csv';

  export(rows: ReportRow[]): Buffer {
    if (rows.length === 0) return Buffer.from('');
    const headers = Object.keys(rows[0]!);
    const lines = [
      headers.join(','),
      ...rows.map((row) => headers.map((h) => escapeCsvCell(row[h] ?? '')).join(',')),
    ];
    return Buffer.from('﻿' + lines.join('\n'), 'utf-8'); // BOM: Excel'de Turkce karakterler dogru gorunsun
  }
}
