import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  normalizeKey,
  parseStudentSheet,
  type ImportProgram,
  type SheetRow,
} from './student-import';

const programs: ImportProgram[] = [
  { id: 'p-akademi', code: 'ILAHIYAT_AKADEMI', name: 'İlahiyat Akademi' },
  { id: 'p-basari', code: 'OZEL_DESTEK_BASARI', name: 'Özel Destek Başarı' },
];

const sheet = (...rows: unknown[][]): SheetRow[] =>
  rows.map((values, index) => ({ rowNumber: index + 1, values }));

describe('normalizeKey', () => {
  it('ignores Turkish letters, case, spacing and hints in parentheses', () => {
    assert.equal(normalizeKey('Kayıt Tarihi (YYYY-MM-DD)'), 'kayittarihi');
    assert.equal(normalizeKey('ÖĞRENCİ NO'), 'ogrencino');
    assert.equal(normalizeKey('Özel Destek Başarı'), 'ozeldestekbasari');
  });
});

describe('parseStudentSheet', () => {
  it('reads columns by header in any order', () => {
    const { students, errors } = parseStudentSheet(
      sheet(
        ['Soyad', 'Ad', 'Öğrenci No', 'Cinsiyet', 'Burs Programı', 'Sınıf', 'Kayıt Tarihi'],
        ['Yıldız', 'Zeynep', '2026-001', 'K', 'özel destek başarı', 'Hazırlık', '15.09.2026'],
        ['Koç', 'Elif', '2026-002', 'Kız', 'ILAHIYAT_AKADEMI', '3. sınıf', '2026-09-01'],
      ),
      programs,
      'FEMALE',
    );
    assert.deepEqual(errors, []);
    assert.equal(students.length, 2);
    assert.deepEqual(
      { ...students[0], enrollDate: students[0].enrollDate.toISOString() },
      {
        rowNumber: 2,
        studentNumber: '2026-001',
        firstName: 'Zeynep',
        lastName: 'Yıldız',
        gender: 'FEMALE',
        scholarshipProgramId: 'p-basari',
        university: undefined,
        department: undefined,
        universityYear: 0,
        phone: undefined,
        guardianName: undefined,
        guardianPhone: undefined,
        guardianEmail: undefined,
        enrollDate: '2026-09-15T00:00:00.000Z',
      },
    );
    assert.equal(students[1].scholarshipProgramId, 'p-akademi');
    assert.equal(students[1].universityYear, 3);
  });

  it('skips invalid rows with row numbers and keeps valid ones', () => {
    const { students, errors } = parseStudentSheet(
      sheet(
        ['Ogrenci No', 'Ad', 'Soyad', 'Cinsiyet', 'Burs', 'Sinif'],
        ['1', 'Ali', 'Arslan', 'E', '', '2'],
        ['2', 'Ayşe', 'Koç', 'K', '', ''],
        ['3', 'Ömer', 'Aydın', '', '', ''],
        ['4', 'Emre', 'Koç', 'E', 'Olmayan Program', ''],
        ['1', 'Ali', 'Arslan', 'E', '', ''],
        ['5', 'Enes', 'Öztürk', 'E', '', '12'],
        ['', 'Eksik', 'Numara', 'E', '', ''],
        ['', null, undefined, '', '', ''],
      ),
      programs,
      'MALE',
    );
    assert.deepEqual(
      students.map((s) => s.studentNumber),
      ['1'],
    );
    assert.deepEqual(errors, [
      'Satir 3: cinsiyet yurt ile uyusmuyor',
      'Satir 4: cinsiyet zorunlu',
      'Satir 5: burs programi bulunamadi: Olmayan Program',
      'Satir 6: 1 dosyada birden fazla kez var',
      'Satir 7: sinif gecersiz: 12',
      'Satir 8: ogrenci no, ad ve soyad zorunlu',
    ]);
  });

  it('requires a gender column only for dormitories with a gender', () => {
    const rows = sheet(['Ogrenci No', 'Ad', 'Soyad'], ['1', 'Ali', 'Arslan']);
    assert.deepEqual(parseStudentSheet(rows, programs, 'MALE'), {
      students: [],
      errors: ['Eksik sutun: Cinsiyet'],
    });
    assert.equal(parseStudentSheet(rows, programs, null).students.length, 1);
  });

  it('reads Excel rich text, formula results and date cells', () => {
    const { students, errors } = parseStudentSheet(
      sheet(
        ['Ogrenci No', 'Ad', 'Soyad', 'Cinsiyet', 'Kayit Tarihi'],
        [
          { result: 7 },
          { richText: [{ text: 'Hü' }, { text: 'seyin' }] },
          'Kaya',
          'Erkek',
          new Date('2026-10-01T00:00:00Z'),
        ],
      ),
      programs,
      'MALE',
    );
    assert.deepEqual(errors, []);
    assert.equal(students[0].studentNumber, '7');
    assert.equal(students[0].firstName, 'Hüseyin');
    assert.equal(students[0].enrollDate.toISOString(), '2026-10-01T00:00:00.000Z');
  });
});
