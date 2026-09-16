export type ReportRow = Record<string, string | number>;

export interface ReportMeta {
  title: string;
  /** Tarihli raporlarda donem bilgisi; tarih araligi olmayan disa aktarimlarda (orn. ogrenci listesi) bos birakilir. */
  from?: string;
  to?: string;
  /** Verilmezse ilk satirin anahtarlarindan turetilir. */
  columns?: string[];
}

export interface ReportExporter {
  contentType: string;
  fileExtension: string;
  export(rows: ReportRow[], meta: ReportMeta): Promise<Buffer> | Buffer;
}
