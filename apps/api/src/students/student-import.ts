import type { Gender } from '@yoklama/db';

export interface ImportProgram {
  id: string;
  code: string;
  name: string;
}

export interface SheetRow {
  rowNumber: number;
  values: unknown[];
}

export interface ImportedStudent {
  rowNumber: number;
  studentNumber: string;
  firstName: string;
  lastName: string;
  gender?: Gender;
  scholarshipProgramId?: string;
  university?: string;
  department?: string;
  universityYear?: number;
  phone?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  enrollDate: Date;
}

type Field =
  | 'studentNumber'
  | 'firstName'
  | 'lastName'
  | 'gender'
  | 'scholarshipProgram'
  | 'university'
  | 'department'
  | 'universityYear'
  | 'phone'
  | 'guardianName'
  | 'guardianPhone'
  | 'guardianEmail'
  | 'enrollDate';

// Sutunlar basliga gore okunur; sablondaki sira degisse de aktarim bozulmaz.
const HEADERS: Record<string, Field> = {
  ogrencino: 'studentNumber',
  ogrencinumarasi: 'studentNumber',
  ad: 'firstName',
  soyad: 'lastName',
  cinsiyet: 'gender',
  burs: 'scholarshipProgram',
  bursprogrami: 'scholarshipProgram',
  universite: 'university',
  bolum: 'department',
  sinif: 'universityYear',
  telefon: 'phone',
  veliadi: 'guardianName',
  velitelefon: 'guardianPhone',
  velieposta: 'guardianEmail',
  kayittarihi: 'enrollDate',
};

const REQUIRED: [Field, string][] = [
  ['studentNumber', 'Ogrenci No'],
  ['firstName', 'Ad'],
  ['lastName', 'Soyad'],
];

const GENDERS: Record<string, Gender> = {
  k: 'FEMALE',
  kiz: 'FEMALE',
  kadin: 'FEMALE',
  female: 'FEMALE',
  e: 'MALE',
  erkek: 'MALE',
  male: 'MALE',
};

/** "Kayıt Tarihi (YYYY-MM-DD)" -> "kayittarihi" */
export function normalizeKey(value: string): string {
  return value
    .replace(/\(.*?\)/g, '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]/g, '');
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const cell = value as { richText?: { text: string }[]; text?: unknown; result?: unknown };
    if (cell.richText)
      return cell.richText
        .map((part) => part.text)
        .join('')
        .trim();
    if (cell.text !== undefined) return cellText(cell.text);
    if (cell.result !== undefined) return cellText(cell.result);
  }
  return String(value).trim();
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  const text = cellText(value);
  if (!text) return new Date();
  const turkish = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(text);
  const date = turkish
    ? new Date(Date.UTC(Number(turkish[3]), Number(turkish[2]) - 1, Number(turkish[1])))
    : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Excel satirlarini dogrular. Hatali satirlar atlanir ve satir numarasiyla raporlanir;
 * yurt cinsiyeti ve burs programi veritabanina gitmeden once burada kontrol edilir.
 */
export function parseStudentSheet(
  sheet: SheetRow[],
  programs: ImportProgram[],
  dormGender: Gender | null,
): { students: ImportedStudent[]; errors: string[] } {
  const [header, ...rows] = sheet;
  if (!header) return { students: [], errors: ['Sayfa bos'] };

  const columns = new Map<Field, number>();
  header.values.forEach((value, index) => {
    const field = HEADERS[normalizeKey(cellText(value))];
    if (field && !columns.has(field)) columns.set(field, index);
  });
  const missing = REQUIRED.filter(([field]) => !columns.has(field)).map(([, label]) => label);
  if (dormGender && !columns.has('gender')) missing.push('Cinsiyet');
  if (missing.length) return { students: [], errors: [`Eksik sutun: ${missing.join(', ')}`] };

  const programIds = new Map<string, string>();
  for (const program of programs) {
    programIds.set(normalizeKey(program.code), program.id);
    programIds.set(normalizeKey(program.name), program.id);
  }

  const students: ImportedStudent[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const { rowNumber, values } of rows) {
    if (values.every((value) => cellText(value) === '')) continue;
    const raw = (field: Field) => {
      const index = columns.get(field);
      return index === undefined ? undefined : values[index];
    };
    const text = (field: Field) => cellText(raw(field)) || undefined;
    const problems: string[] = [];

    const studentNumber = text('studentNumber');
    const firstName = text('firstName');
    const lastName = text('lastName');
    if (!studentNumber || !firstName || !lastName) problems.push('ogrenci no, ad ve soyad zorunlu');
    else if (seen.has(studentNumber))
      problems.push(`${studentNumber} dosyada birden fazla kez var`);

    const genderText = text('gender');
    const gender = genderText ? GENDERS[normalizeKey(genderText)] : undefined;
    if (genderText && !gender) problems.push(`cinsiyet anlasilamadi: ${genderText}`);
    else if (dormGender && gender !== dormGender) {
      problems.push(gender ? 'cinsiyet yurt ile uyusmuyor' : 'cinsiyet zorunlu');
    }

    const programText = text('scholarshipProgram');
    const scholarshipProgramId = programText
      ? programIds.get(normalizeKey(programText))
      : undefined;
    if (programText && !scholarshipProgramId) {
      problems.push(`burs programi bulunamadi: ${programText}`);
    }

    const yearText = text('universityYear');
    let universityYear: number | undefined;
    if (yearText) {
      universityYear = normalizeKey(yearText).startsWith('hazirlik')
        ? 0
        : Number.parseInt(yearText, 10);
      if (!Number.isInteger(universityYear) || universityYear < 0 || universityYear > 10) {
        problems.push(`sinif gecersiz: ${yearText}`);
      }
    }

    const enrollDate = parseDate(raw('enrollDate'));
    if (!enrollDate) problems.push(`kayit tarihi gecersiz: ${text('enrollDate')}`);

    if (problems.length || !studentNumber || !firstName || !lastName || !enrollDate) {
      errors.push(`Satir ${rowNumber}: ${problems.join('; ')}`);
      continue;
    }
    seen.add(studentNumber);
    students.push({
      rowNumber,
      studentNumber,
      firstName,
      lastName,
      gender,
      scholarshipProgramId,
      university: text('university'),
      department: text('department'),
      universityYear,
      phone: text('phone'),
      guardianName: text('guardianName'),
      guardianPhone: text('guardianPhone'),
      guardianEmail: text('guardianEmail'),
      enrollDate,
    });
  }
  return { students, errors };
}
