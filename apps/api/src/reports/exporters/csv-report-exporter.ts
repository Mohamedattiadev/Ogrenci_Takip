import type { ReportExporter, ReportMeta, ReportRow } from './report-exporter.interface';

const DELIMITER = ';'; // Turkce Excel'de varsayilan liste ayiraci ';' dir - ',' kullanilirsa tum satir tek hucreye sikisir

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  return /["\n;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** Hafif, bagimliliksiz CSV uretici - format eklemek Factory'ye yeni bir sinif eklemek demek. */
export class CsvReportExporter implements ReportExporter {
  contentType = 'text/csv; charset=utf-8';
  fileExtension = 'csv';

  export(rows: ReportRow[], meta: ReportMeta): Buffer {
    const headers = meta.columns ?? (rows.length > 0 ? Object.keys(rows[0]!) : []);
    if (headers.length === 0) return Buffer.from('');
    const lines = [
      headers.join(DELIMITER),
      ...rows.map((row) => headers.map((h) => escapeCsvCell(row[h] ?? '')).join(DELIMITER)),
    ];
    return Buffer.from('﻿' + lines.join('\r\n'), 'utf-8'); // BOM: Excel'de Turkce karakterler dogru gorunsun
  }
}
