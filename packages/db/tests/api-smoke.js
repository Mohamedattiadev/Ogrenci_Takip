// Local HTTP integration check against demo data. No passwords or tokens are printed.
// Rows created here (lesson session, attendance, audit entries, imported student, temporary
// dormitory admin) are deleted at the end; demo data is left as it was.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { createRequire } = require('node:module');
const { hash } = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const root = path.resolve(__dirname, '..');
const apiRoot = path.resolve(root, '../../apps/api');
const { Workbook } = createRequire(path.join(apiRoot, 'package.json'))('exceljs');
const env = dotenv.parse(fs.readFileSync(path.join(root, '.env')));
const db = new PrismaClient({ datasourceUrl: env.MIGRATE_DATABASE_URL });
const accounts = JSON.parse(fs.readFileSync(path.join(root, 'demo-accounts.local.json')));
const port = 3197;
const cleanup = { occurrenceIds: [], studentNumbers: [], adminId: null };
const server = spawn(process.execPath, ['dist/main.js'], {
  cwd: apiRoot,
  env: { ...process.env, API_PORT: String(port) },
  stdio: 'ignore',
  windowsHide: true,
});
async function request(route, token, body, method = body ? 'POST' : 'GET') {
  const isForm = body instanceof FormData;
  const response = await fetch(`http://127.0.0.1:${port}/api/v1/${route}`, {
    method,
    headers: {
      ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: isForm ? body : JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new Error(
      `${method} ${route}: HTTP ${response.status} ${(await response.text()).slice(0, 300)}`,
    );
  }
  return response.json();
}
const login = (email, password) => request('auth/login', null, { email, password });

async function main() {
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) throw new Error('API exited before startup');
    try {
      await fetch(`http://127.0.0.1:${port}/docs`, { signal: AbortSignal.timeout(500) });
      ready = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  assert.ok(ready, 'API did not start');
  const admin = accounts[5];
  const adminLogin = await login(admin.email, admin.password);
  const students = await request('students', adminLogin.accessToken);
  assert.equal(students.filter((s) => s.studentNumber.startsWith('DEMO-')).length, 100);
  assert.equal(students.filter((s) => s.gender === 'FEMALE').length, 50);
  assert.equal(students.filter((s) => s.gender === 'MALE').length, 50);
  assert.equal((await request('scholarships', adminLogin.accessToken)).length, 6);
  for (const teacher of accounts.slice(0, 5)) {
    const teacherLogin = await login(teacher.email, teacher.password);
    const visible = await request('students', teacherLogin.accessToken);
    const expected = await db.student.findMany({
      where: {
        memberships: {
          some: { group: { schedules: { some: { teacherId: teacherLogin.user.id } } } },
        },
      },
      select: { id: true },
    });
    assert.deepEqual(visible.map((s) => s.id).sort(), expected.map((s) => s.id).sort());
    const refreshed = await request('auth/refresh', null, {
      refreshToken: teacherLogin.refreshToken,
    });
    assert.ok(refreshed.accessToken);
    assert.ok(visible.length > 0 && visible.length < 100);
  }

  // Teacher takes and corrects attendance in a dormitory other than their home dormitory.
  const teacherLogin = await login(accounts[0].email, accounts[0].password);
  const schedules = await request('schedule', teacherLogin.accessToken);
  const remote = schedules.find((s) => s.institutionId !== teacherLogin.user.institutionId);
  assert.ok(remote, 'demo teacher needs a lesson in another dormitory');
  const range = { from: '2027-05-10', to: '2027-05-16' };
  const existingSessions = await db.sessionOccurrence.count({
    where: { scheduleId: remote.id, date: { gte: new Date(range.from), lte: new Date(range.to) } },
  });
  assert.equal(existingSessions, 0, 'test week already has sessions; refusing to touch them');
  const [session] = await request(
    `schedule/${remote.id}/occurrences`,
    adminLogin.accessToken,
    range,
  );
  cleanup.occurrenceIds.push(session.id);
  const { roster } = await request(`attendance/occurrence/${session.id}`, teacherLogin.accessToken);
  assert.ok(roster.length > 0);
  const records = await request('attendance', teacherLogin.accessToken, {
    sessionOccurrenceId: session.id,
    entries: roster.map((r) => ({ studentId: r.student.id, status: 'PRESENT' })),
  });
  const corrected = await request(
    `attendance/${records[0].id}`,
    teacherLogin.accessToken,
    { status: 'LATE', note: 'smoke test' },
    'PATCH',
  );
  assert.equal(corrected.status, 'LATE');
  const audit = await db.auditLog.findFirstOrThrow({ where: { entityId: records[0].id } });
  assert.equal(audit.actorId, teacherLogin.user.id);
  assert.equal(audit.institutionId, remote.institutionId);

  // Excel import by a dormitory admin: one valid row, one rejected by validation,
  // one rejected by a database rule (program change with an active group membership).
  const demo = await db.student.findFirstOrThrow({
    where: { studentNumber: 'DEMO-0001' },
    include: { scholarshipProgram: true, institution: true },
  });
  const otherProgram = await db.scholarshipProgram.findFirstOrThrow({
    where: { id: { not: demo.scholarshipProgramId } },
  });
  const adminPassword = randomBytes(18).toString('base64url');
  const dormAdmin = await db.user.create({
    data: {
      institutionId: demo.institutionId,
      role: 'INSTITUTION_ADMIN',
      fullName: 'Smoke Test Yurt Yoneticisi',
      email: `smoke-admin-${Date.now()}@example.invalid`,
      passwordHash: await hash(adminPassword, 10),
    },
  });
  cleanup.adminId = dormAdmin.id;
  const dormAdminLogin = await login(dormAdmin.email, adminPassword);
  const importNumber = `SMOKE-IMPORT-${Date.now()}`;
  cleanup.studentNumbers.push(importNumber);
  const gender = demo.institution.gender === 'FEMALE' ? 'K' : 'E';
  const workbook = new Workbook();
  workbook.addWorksheet('Ogrenciler').addRows([
    ['Öğrenci No', 'Ad', 'Soyad', 'Cinsiyet', 'Burs Programı', 'Sınıf'],
    [importNumber, 'Test', 'Aktarim', gender, demo.scholarshipProgram.code, 'Hazırlık'],
    [`${importNumber}-X`, 'Yanlis', 'Cinsiyet', gender === 'K' ? 'E' : 'K', '', ''],
    ['DEMO-0001', demo.firstName, demo.lastName, gender, otherProgram.code, ''],
  ]);
  const form = new FormData();
  form.append('file', new Blob([await workbook.xlsx.writeBuffer()]), 'ogrenciler.xlsx');
  const imported = await request('students/import', dormAdminLogin.accessToken, form);
  assert.equal(imported.imported, 1);
  assert.deepEqual(imported.errors, [
    'Satir 3: cinsiyet yurt ile uyusmuyor',
    'Satir 4: Close active group memberships before changing dormitory or program',
  ]);
  const created = await db.student.findFirstOrThrow({ where: { studentNumber: importNumber } });
  assert.equal(created.universityYear, 0);
  assert.equal(created.scholarshipProgramId, demo.scholarshipProgramId);
  const unchanged = await db.student.findUniqueOrThrow({ where: { id: demo.id } });
  assert.equal(unchanged.scholarshipProgramId, demo.scholarshipProgramId);

  console.log(
    'API smoke passed: admin sees 100 students (50 female / 50 male), 6 programs; all 5 teachers see exactly their assigned students; login/refresh works; teacher corrects attendance in another dormitory with audit; Excel import keeps valid rows and reports invalid ones.',
  );
}
main()
  .catch((error) => {
    console.error('API smoke failed: ' + error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    server.kill();
    const recordIds = (
      await db.attendanceRecord.findMany({
        where: { sessionOccurrenceId: { in: cleanup.occurrenceIds } },
        select: { id: true },
      })
    ).map((r) => r.id);
    await db.auditLog.deleteMany({ where: { entityId: { in: recordIds } } });
    await db.attendanceRecord.deleteMany({ where: { id: { in: recordIds } } });
    await db.sessionOccurrence.deleteMany({ where: { id: { in: cleanup.occurrenceIds } } });
    await db.student.deleteMany({ where: { studentNumber: { in: cleanup.studentNumbers } } });
    if (cleanup.adminId) {
      await db.refreshToken.deleteMany({ where: { userId: cleanup.adminId } });
      await db.user.delete({ where: { id: cleanup.adminId } });
    }
    // Revoke test sessions rather than leaving active refresh credentials behind.
    const users = await db.user.findMany({
      where: { email: { in: accounts.map((a) => a.email) } },
      select: { id: true },
    });
    await db.refreshToken.updateMany({
      where: { userId: { in: users.map((u) => u.id) } },
      data: { revokedAt: new Date() },
    });
    await db.$disconnect();
  });
