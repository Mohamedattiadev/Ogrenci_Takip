import { join } from 'path';
import PDFDocument from 'pdfkit';
import type { ReportExporter, ReportMeta, ReportRow } from './report-exporter.interface';

const ASSETS_DIR = join(__dirname, '..', '..', 'assets', 'reports');
const FONT_REGULAR = join(ASSETS_DIR, 'fonts', 'NotoSans-Regular.ttf');
const FONT_BOLD = join(ASSETS_DIR, 'fonts', 'NotoSans-Bold.ttf');
const LOGO_PATH = join(ASSETS_DIR, 'tdv-mark.png');
const LOGO_RATIO = 1965.85 / 1677.53;

const COLOR = {
  navy: '#163480',
  text: '#1c2436',
  subtext: '#5b6478',
  border: '#c9cfdb',
  rowAlt: '#f4f6fa',
  white: '#ffffff',
};

const PAGE_MARGIN = 36;
const FOOTER_HEIGHT = 26;
const CELL_PAD_X = 5;
const CELL_PAD_Y = 4;
const MIN_ROW_HEIGHT = 16;
const BODY_SIZE = 8.5;
const HEADER_SIZE = 8.5;

/** Kimlik/aciklama niteligindeki sutunlar sola, sayisal/durum sutunlari ortaya hizalanir. */
const LEFT_ALIGN_HEADERS = new Set([
  'Ad Soyad',
  'Not',
  'Öğretmen',
  'Grup',
  'Ders',
  'Yurt',
  'Burs Programı',
]);

function trDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

function generatedAtLabel(date: Date): string {
  return `${new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)}`;
}

function columnWidths(headers: string[], rows: ReportRow[], contentWidth: number): number[] {
  const sample = rows.slice(0, 300);
  const weights = headers.map((header) => {
    const longest = sample.reduce(
      (max, row) => Math.max(max, String(row[header] ?? '').length),
      header.length,
    );
    return Math.min(Math.max(longest, 5), 40);
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const minWidth = 42;
  const raw = weights.map((w) => Math.max((w / totalWeight) * contentWidth, minWidth));
  const rawTotal = raw.reduce((a, b) => a + b, 0);
  const scale = contentWidth / rawTotal;
  const widths = raw.map((w) => w * scale);
  // Yuvarlama farkini son sutuna ekle ki tablo tam contentWidth kadar olsun.
  const roundedTotal = widths.reduce((a, b) => a + b, 0);
  widths[widths.length - 1]! += contentWidth - roundedTotal;
  return widths;
}

function drawGrid(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  widths: number[],
  height: number,
  strokeColor: string,
  opacity: number,
) {
  doc.save().strokeColor(strokeColor).strokeOpacity(opacity).lineWidth(0.75);
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  doc.rect(x, y, totalWidth, height).stroke();
  let cx = x;
  for (let i = 0; i < widths.length - 1; i += 1) {
    cx += widths[i]!;
    doc
      .moveTo(cx, y)
      .lineTo(cx, y + height)
      .stroke();
  }
  doc.restore();
}

function drawRowCells(
  doc: PDFKit.PDFDocument,
  headers: string[],
  values: string[],
  x: number,
  y: number,
  widths: number[],
  height: number,
  font: string,
  size: number,
  color: string,
) {
  doc.font(font).fontSize(size).fillColor(color);
  let cx = x;
  headers.forEach((header, i) => {
    const width = widths[i]!;
    const align = LEFT_ALIGN_HEADERS.has(header) ? 'left' : 'center';
    const textHeight = doc.heightOfString(values[i]!, { width: width - CELL_PAD_X * 2, align });
    const textY = y + Math.max((height - textHeight) / 2, CELL_PAD_Y / 2);
    doc.text(values[i]!, cx + CELL_PAD_X, textY, { width: width - CELL_PAD_X * 2, align });
    cx += width;
  });
}

/**
 * Resmi kurum evrağı görünümü: TDV logosu + kurum adı, rapor başlığı, dönem bilgisi,
 * ızgaralı/başlıklı tablo ve her sayfada sayfa numarası. Türkçe karakterler (ş, ğ, ı, ö, ü, ç)
 * için Noto Sans gömülüdür - pdfkit'in yerleşik Helvetica fontu bu karakterleri desteklemez.
 */
export class PdfReportExporter implements ReportExporter {
  contentType = 'application/pdf';
  fileExtension = 'pdf';

  export(rows: ReportRow[], meta: ReportMeta): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: PAGE_MARGIN,
        size: 'A4',
        layout: 'landscape',
        bufferPages: true,
        info: { Title: meta.title, Author: 'Türkiye Diyanet Vakfı' },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.registerFont('Body', FONT_REGULAR);
      doc.registerFont('Bold', FONT_BOLD);

      const contentWidth = doc.page.width - PAGE_MARGIN * 2;
      const y = this.drawBrandHeader(doc, meta, contentWidth, false);

      if (rows.length === 0) {
        doc
          .font('Body')
          .fontSize(10)
          .fillColor(COLOR.subtext)
          .text('Bu tarih aralığında kayıt bulunamadı.', PAGE_MARGIN, y, {
            width: contentWidth,
            align: 'center',
          });
      } else {
        this.drawTable(doc, rows, meta, contentWidth, y);
      }

      this.drawFooters(doc, contentWidth);
      doc.end();
    });
  }

  private drawBrandHeader(
    doc: PDFKit.PDFDocument,
    meta: ReportMeta,
    contentWidth: number,
    continuation: boolean,
  ): number {
    const top = PAGE_MARGIN;
    const logoWidth = continuation ? 20 : 32;
    const logoHeight = logoWidth * LOGO_RATIO;
    doc.image(LOGO_PATH, PAGE_MARGIN, top, { width: logoWidth });

    const textX = PAGE_MARGIN + logoWidth + 10;
    doc
      .font('Bold')
      .fontSize(continuation ? 10 : 12.5)
      .fillColor(COLOR.navy)
      .text('TÜRKİYE DİYANET VAKFI', textX, top + (continuation ? 1 : 1), { lineBreak: false });
    doc
      .font('Body')
      .fontSize(continuation ? 7.5 : 8.5)
      .fillColor(COLOR.subtext)
      .text('Yurt Yönetim ve Yoklama Sistemi', textX, top + (continuation ? 12 : 16), {
        lineBreak: false,
      });
    doc
      .font('Body')
      .fontSize(7.5)
      .fillColor(COLOR.subtext)
      .text(`Oluşturma: ${generatedAtLabel(new Date())}`, PAGE_MARGIN, top + 2, {
        width: contentWidth,
        align: 'right',
      });

    const ruleY = top + Math.max(logoHeight, continuation ? 18 : 30) + 8;
    doc
      .moveTo(PAGE_MARGIN, ruleY)
      .lineTo(PAGE_MARGIN + contentWidth, ruleY)
      .lineWidth(1.2)
      .strokeColor(COLOR.navy)
      .stroke();

    let y = ruleY + (continuation ? 10 : 14);
    if (!continuation) {
      doc
        .font('Bold')
        .fontSize(14)
        .fillColor(COLOR.navy)
        .text(meta.title, PAGE_MARGIN, y, { width: contentWidth, align: 'center' });
      y += 20;
      if (meta.from && meta.to) {
        doc
          .font('Body')
          .fontSize(9.5)
          .fillColor(COLOR.subtext)
          .text(`Dönem: ${trDate(meta.from)} – ${trDate(meta.to)}`, PAGE_MARGIN, y, {
            width: contentWidth,
            align: 'center',
          });
        y += 18;
      }
    } else {
      doc
        .font('Bold')
        .fontSize(10)
        .fillColor(COLOR.navy)
        .text(`${meta.title} (devam)`, PAGE_MARGIN, y, { width: contentWidth, align: 'center' });
      y += 16;
    }
    return y;
  }

  private drawTable(
    doc: PDFKit.PDFDocument,
    rows: ReportRow[],
    meta: ReportMeta,
    contentWidth: number,
    startY: number,
  ) {
    const headers = meta.columns ?? Object.keys(rows[0]!);
    const widths = columnWidths(headers, rows, contentWidth);
    let y = startY;

    const drawHeaderRow = () => {
      doc.font('Bold').fontSize(HEADER_SIZE);
      const headerHeight =
        Math.max(
          ...headers.map((h, i) => doc.heightOfString(h, { width: widths[i]! - CELL_PAD_X * 2 })),
        ) +
        CELL_PAD_Y * 2;
      doc.rect(PAGE_MARGIN, y, contentWidth, headerHeight).fill(COLOR.navy);
      drawRowCells(
        doc,
        headers,
        headers,
        PAGE_MARGIN,
        y,
        widths,
        headerHeight,
        'Bold',
        HEADER_SIZE,
        COLOR.white,
      );
      drawGrid(doc, PAGE_MARGIN, y, widths, headerHeight, COLOR.white, 0.35);
      y += headerHeight;
    };

    drawHeaderRow();

    rows.forEach((row, index) => {
      const values = headers.map((h) => String(row[h] ?? ''));
      doc.font('Body').fontSize(BODY_SIZE);
      const rowHeight = Math.max(
        MIN_ROW_HEIGHT,
        Math.max(
          ...values.map((v, i) =>
            doc.heightOfString(v, {
              width: widths[i]! - CELL_PAD_X * 2,
              align: LEFT_ALIGN_HEADERS.has(headers[i]!) ? 'left' : 'center',
            }),
          ),
        ) +
          CELL_PAD_Y * 2,
      );

      if (y + rowHeight > doc.page.height - PAGE_MARGIN - FOOTER_HEIGHT) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: PAGE_MARGIN });
        y = this.drawBrandHeader(doc, meta, contentWidth, true);
        drawHeaderRow();
      }

      if (index % 2 === 1) {
        doc.rect(PAGE_MARGIN, y, contentWidth, rowHeight).fill(COLOR.rowAlt);
      }
      drawRowCells(
        doc,
        headers,
        values,
        PAGE_MARGIN,
        y,
        widths,
        rowHeight,
        'Body',
        BODY_SIZE,
        COLOR.text,
      );
      drawGrid(doc, PAGE_MARGIN, y, widths, rowHeight, COLOR.border, 1);
      y += rowHeight;
    });
  }

  private drawFooters(doc: PDFKit.PDFDocument, contentWidth: number) {
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i += 1) {
      doc.switchToPage(range.start + i);
      // pdfkit, alt kenar boslugunun sinirina yakin text() cagrilarinda otomatik
      // olarak yeni (bos) sayfa ekler; footer'i cizerken bunu gecici olarak kapatiyoruz.
      const bottomMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;

      const footerY = doc.page.height - PAGE_MARGIN - 16;
      doc
        .moveTo(PAGE_MARGIN, footerY)
        .lineTo(PAGE_MARGIN + contentWidth, footerY)
        .lineWidth(0.5)
        .strokeColor(COLOR.border)
        .stroke();
      doc
        .font('Body')
        .fontSize(7.5)
        .fillColor(COLOR.subtext)
        .text('Türkiye Diyanet Vakfı – Yoklama Sistemi', PAGE_MARGIN, footerY + 4, {
          width: contentWidth / 2,
          align: 'left',
          lineBreak: false,
        });
      doc
        .font('Body')
        .fontSize(7.5)
        .fillColor(COLOR.subtext)
        .text(`Sayfa ${i + 1} / ${range.count}`, PAGE_MARGIN + contentWidth / 2, footerY + 4, {
          width: contentWidth / 2,
          align: 'right',
          lineBreak: false,
        });

      doc.page.margins.bottom = bottomMargin;
    }
  }
}
