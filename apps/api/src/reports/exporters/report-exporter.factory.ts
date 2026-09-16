import { BadRequestException } from '@nestjs/common';
import { CsvReportExporter } from './csv-report-exporter';
import { ExcelReportExporter } from './excel-report-exporter';
import { PdfReportExporter } from './pdf-report-exporter';
import type { ReportExporter } from './report-exporter.interface';

export type ReportFormat = 'csv' | 'excel' | 'pdf';

/**
 * Factory pattern: yeni bir export formati eklemek yeni bir sinif + burada bir
 * satir demek - mevcut servis/controller kodu degismez (Open/Closed).
 * Not: "excel" burada ogrenci listesi disa aktarimi (StudentsService.export) icin
 * durur - Raporlar sayfasi kendi DTO'sunda (ReportQueryDto) sadece csv/pdf sunar.
 */
export function getReportExporter(format: ReportFormat): ReportExporter {
  switch (format) {
    case 'csv':
      return new CsvReportExporter();
    case 'excel':
      return new ExcelReportExporter();
    case 'pdf':
      return new PdfReportExporter();
    default:
      throw new BadRequestException(`Bilinmeyen rapor formati: ${format}`);
  }
}
