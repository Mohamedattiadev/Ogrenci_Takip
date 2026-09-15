export type ReportRow = Record<string, string | number>;

export interface ReportExporter {
  contentType: string;
  fileExtension: string;
  export(rows: ReportRow[], title: string): Promise<Buffer> | Buffer;
}
