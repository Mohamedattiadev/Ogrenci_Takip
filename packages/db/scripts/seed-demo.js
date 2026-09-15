// Synthetic development data. Idempotent: never truncates tables or replaces real records.
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomBytes } = require('node:crypto');
const { hash } = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const root = path.resolve(__dirname, '..');
const env = dotenv.parse(fs.readFileSync(path.join(root, '.env')));
const db = new PrismaClient({ datasourceUrl: env.MIGRATE_DATABASE_URL });
const id = (key) => {
  const h = createHash('sha256')
    .update('diyanet-demo-v1:' + key)
    .digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const programs = [
  ['ILAHIYAT_AKADEMI', 'İlahiyat Akademi'],
  ['ILAHIYAT_AKADEMI_DESTEK', 'İlahiyat Akademi Destek'],
  ['OZEL_DESTEK_AKADEMI', 'Özel Destek Akademi'],
  ['OZEL_DESTEK_BASARI', 'Özel Destek Başarı'],
  ['ULUSLARARASI_AIHL_MEZUN_AKADEMI', 'Uluslararası AİHL Mezun Akademi'],
  ['LISANSUSTU_ILAHIYAT_AKADEMI', 'Lisansüstü İlahiyat Akademi'],
];
const dorms = [
  'TDV Erkek Öğrenci Yurdu Ankara',
  'TDV Erkek Öğrenci Yurdu İstanbul',
  'TDV Kız Öğrenci Yurdu Konya',
  'TDV Kız Öğrenci Yurdu Bursa',
];
const teachers = ['Ahmet Yılmaz', 'Mehmet Demir', 'Mustafa Kaya', 'Yusuf Şahin', 'İbrahim Çelik'];
const firstNames = [
  'Ali',
  'Ömer',
  'Hasan',
  'Hüseyin',
  'Emre',
  'Burak',
  'Enes',
  'Murat',
  'Kerem',
  'Fatih',
  'Zeynep',
  'Elif',
  'Ayşe',
  'Fatma',
  'Meryem',
  'Esra',
  'Sümeyye',
  'Büşra',
  'Betül',
  'Hatice',
];
const surnames = ['Arslan', 'Aydın', 'Koç', 'Yıldız', 'Öztürk'];
const credentialsFile = path.join(root, 'demo-accounts.local.json');

async function main() {
  if (!env.MIGRATE_DATABASE_URL) throw new Error('Missing database configuration');
  // Index layout: 0-4 teachers, 5 system administrator, 6-9 dormitory administrators.
  const exists = fs.existsSync(credentialsFile);
  const accounts = exists
    ? JSON.parse(fs.readFileSync(credentialsFile))
    : [
        ...teachers.map((name, i) => ({ name, email: `hoca${i + 1}@example.invalid` })),
        { name: 'Demo Sistem Yöneticisi', email: 'admin@example.invalid' },
      ];
  let changed = !exists;
  dorms.forEach((_, d) => {
    if (!accounts[6 + d]) {
      accounts[6 + d] = {
        name: `Demo Yurt Yöneticisi ${d + 1}`,
        email: `yurt${d + 1}@example.invalid`,
      };
      changed = true;
    }
  });
  for (const account of accounts) {
    if (!account.password) {
      account.password = randomBytes(18).toString('base64url');
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(credentialsFile, JSON.stringify(accounts, null, 2));
  const hashes = await Promise.all(accounts.map((a) => hash(a.password, 10)));
  await db.$transaction(
    async (tx) => {
      const programIds = [];
      for (const [code, name] of programs) {
        const p = await tx.scholarshipProgram.upsert({
          where: { code },
          update: {},
          create: { id: id(code), code, name },
        });
        programIds.push(p.id);
      }
      for (let d = 0; d < 4; d++) {
        await tx.institution.upsert({
          where: { id: id(`dorm${d}`) },
          update: {},
          create: { id: id(`dorm${d}`), code: `DEMO-YURT-${d + 1}`, name: dorms[d] },
        });
        await tx.academicTerm.upsert({
          where: { id: id(`term${d}`) },
          update: {},
          create: {
            id: id(`term${d}`),
            institutionId: id(`dorm${d}`),
            name: '2026–2027 Örnek Dönem',
            startDate: new Date('2026-09-01'),
            endDate: new Date('2027-06-30'),
          },
        });
        await tx.course.upsert({
          where: { id: id(`course${d}`) },
          update: {},
          create: {
            id: id(`course${d}`),
            institutionId: id(`dorm${d}`),
            name: 'Temel İslami İlimler (Örnek Ders)',
          },
        });
      }
      for (let t = 0; t < accounts.length; t++) {
        await tx.user.upsert({
          where: { id: id(`user${t}`) },
          update: {},
          create: {
            id: id(`user${t}`),
            institutionId: t < 5 ? id(`dorm${t % 4}`) : t === 5 ? null : id(`dorm${t - 6}`),
            role: t < 5 ? 'TEACHER' : t === 5 ? 'SUPER_ADMIN' : 'INSTITUTION_ADMIN',
            fullName: accounts[t].name,
            email: accounts[t].email,
            passwordHash: hashes[t],
          },
        });
      }
      for (let d = 0; d < 4; d++)
        for (let p = 0; p < 6; p++) {
          const t = (d + p) % 5;
          await tx.group.upsert({
            where: { id: id(`group${d}-${p}`) },
            update: {},
            create: {
              id: id(`group${d}-${p}`),
              institutionId: id(`dorm${d}`),
              termId: id(`term${d}`),
              scholarshipProgramId: programIds[p],
              name: `${programs[p][1]} — Örnek Grup`,
            },
          });
          const assignment = await tx.teacherAssignment.upsert({
            where: {
              teacherId_institutionId_scholarshipProgramId: {
                teacherId: id(`user${t}`),
                institutionId: id(`dorm${d}`),
                scholarshipProgramId: programIds[p],
              },
            },
            update: {},
            create: {
              id: id(`assignment${d}-${p}`),
              teacherId: id(`user${t}`),
              institutionId: id(`dorm${d}`),
              scholarshipProgramId: programIds[p],
            },
          });
          await tx.lessonSchedule.upsert({
            where: { id: id(`schedule${d}-${p}`) },
            update: {},
            create: {
              id: id(`schedule${d}-${p}`),
              institutionId: id(`dorm${d}`),
              groupId: id(`group${d}-${p}`),
              courseId: id(`course${d}`),
              teacherId: id(`user${t}`),
              assignmentId: assignment.id,
              dayOfWeek: p,
              startTime: `${10 + d}:00`,
              endTime: `${11 + d}:00`,
            },
          });
        }
      for (let i = 0; i < 100; i++) {
        const d = i % 4,
          p = Math.floor(i / 4) % 6;
        await tx.student.upsert({
          where: { id: id(`student${i}`) },
          update: {},
          create: {
            id: id(`student${i}`),
            studentNumber: `DEMO-${String(i + 1).padStart(4, '0')}`,
            firstName: firstNames[((Math.floor(i / 4) * 2 + (i % 2)) % 10) + (d < 2 ? 0 : 10)],
            lastName: surnames[Math.floor((Math.floor(i / 4) * 2 + (i % 2)) / 10)],
            gender: d < 2 ? 'MALE' : 'FEMALE',
            institutionId: id(`dorm${d}`),
            scholarshipProgramId: programIds[p],
            university: [
              'Ankara Üniversitesi',
              'İstanbul Üniversitesi',
              'Necmettin Erbakan Üniversitesi',
              'Bursa Uludağ Üniversitesi',
            ][d],
            department:
              p === 3
                ? ['Bilgisayar Mühendisliği', 'Tarih', 'İlahiyat', 'Türk Dili ve Edebiyatı'][d]
                : 'İlahiyat',
            universityYear: p === 5 ? null : 1 + (Math.floor(i / 6) % 4),
            enrollDate: new Date('2026-09-01'),
          },
        });
        await tx.groupMembership.upsert({
          where: { id: id(`membership${i}`) },
          update: {},
          create: {
            id: id(`membership${i}`),
            studentId: id(`student${i}`),
            groupId: id(`group${d}-${p}`),
            effectiveFrom: new Date('2026-09-01'),
          },
        });
      }
      // Update only deterministic demo IDs created by this script; preserve other data.
      // One statement also corrects the initial demo's mixed dormitories atomically.
      const quote = (value) => "'" + value.replaceAll("'", "''") + "'";
      const values = Array.from({ length: 100 }, (_, i) => {
        const index = Math.floor(i / 4) * 2 + (i % 2);
        return [
          id(`student${i}`),
          i % 4 < 2 ? 'MALE' : 'FEMALE',
          firstNames[(index % 10) + (i % 4 < 2 ? 0 : 10)],
          surnames[Math.floor(index / 10)],
        ];
      });
      await tx.$executeRawUnsafe(`UPDATE "Student" s SET gender=v.gender::"Gender", "firstName"=v.first_name, "lastName"=v.last_name
        FROM (VALUES ${values.map((row) => '(' + row.map(quote).join(',') + ')').join(',')}) AS v(id,gender,first_name,last_name) WHERE s.id=v.id`);
      for (let d = 0; d < 4; d++) {
        await tx.institution.update({
          where: { id: id(`dorm${d}`) },
          data: { name: dorms[d], gender: d < 2 ? 'MALE' : 'FEMALE' },
        });
      }
    },
    { timeout: 180000 },
  );
  const count = await db.student.count({ where: { studentNumber: { startsWith: 'DEMO-' } } });
  console.log(
    `Demo ready: ${count} students, 5 teachers, 1 system administrator, 4 dormitory administrators, 4 dormitories, 6 programs, 24 groups/schedules. Credentials saved locally, not printed.`,
  );
}
main()
  .catch(() => {
    console.error('Demo setup failed. Credentials hidden; transaction rolled back if unfinished.');
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
