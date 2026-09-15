// End-to-end HTTP check of the v1 API against demo data. No passwords or tokens are printed.
// Rows created here (sessions, attendance, audit entries, imported students, a temporary group
// and transfer memberships) are removed at the end; demo data is restored.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const root = path.resolve(__dirname, '..');
const apiRoot = path.resolve(root, '../../apps/api');
const { Workbook } = createRequire(path.join(apiRoot, 'package.json'))('exceljs');
const env = dotenv.parse(fs.readFileSync(path.join(root, '.env')));
const db = new PrismaClient({ datasourceUrl: env.MIGRATE_DATABASE_URL });
const accounts = JSON.parse(fs.readFileSync(path.join(root, 'demo-accounts.local.json')));
assert.ok(accounts.length >= 10, 'run seed-demo.js first (needs dormitory administrator accounts)');
const port = 3197;
const cleanup = {
  sessionIds: [],
  studentNumbers: [],
  groupIds: [],
  restoreMemberships: [],
  assignmentIds: [],
  portal: null,
  abort: null,
};
const server = spawn(process.execPath, ['dist/main.js'], {
  cwd: apiRoot,
  env: { ...process.env, API_PORT: String(port) },
  stdio: 'ignore',
  windowsHide: true,
});

async function call(method, route, { token, body, expect = 200 } = {}) {
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
  const type = response.headers.get('content-type') ?? '';
  const payload =
    response.status === 204
      ? null
      : type.includes('json')
        ? await response.json()
        : Buffer.from(await response.arrayBuffer());
  if (response.status !== expect) {
    const detail =
      payload && !Buffer.isBuffer(payload) ? JSON.stringify(payload).slice(0, 300) : '';
    throw new Error(`${method} ${route}: expected ${expect}, got ${response.status} ${detail}`);
  }
  return { body: payload, headers: response.headers };
}
const get = (route, token, expect) => call('GET', route, { token, expect }).then((r) => r.body);
const post = (route, token, body, expect = 201) =>
  call('POST', route, { token, body, expect }).then((r) => r.body);
const login = (account) =>
  post(
    'auth/login',
    null,
    { email: account.email ?? account.username, password: account.password },
    200,
  );

async function main() {
  let ready = false;
  for (let i = 0; i < 120 && !ready; i++) {
    if (server.exitCode !== null) throw new Error('API exited before startup');
    try {
      ready = (await fetch(`http://127.0.0.1:${port}/api/v1/health`)).ok;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  assert.ok(ready, 'API did not start');
  assert.equal((await get('health')).database, 'ok');

  // --- Auth, uniform errors, pagination
  const admin = await login(accounts[5]);
  assert.equal((await get('auth/me', admin.accessToken)).role, 'SUPER_ADMIN');
  const error = await get('students?pageSize=1000', admin.accessToken, 400);
  assert.equal(error.statusCode, 400);
  assert.ok(error.message && error.path && error.timestamp);
  await get('students/not-a-uuid', admin.accessToken, 400);
  await get('students', null, 401);
  const noDorm = { studentNumber: 'X', firstName: 'Ab', lastName: 'Cd', enrollDate: '2026-10-01' };
  await post('students', admin.accessToken, noDorm, 400); // super admin must choose a dormitory

  const demo = await get('students?search=DEMO&pageSize=100', admin.accessToken);
  assert.equal(demo.meta.total, 100);
  assert.equal(demo.data.filter((s) => s.gender === 'FEMALE').length, 50);
  assert.equal((await get('scholarship-programs', admin.accessToken)).meta.total, 6);
  assert.ok((await get('institutions', admin.accessToken)).meta.total >= 4);

  // --- Teachers see exactly their assigned students; refresh rotation and logout
  for (const account of accounts.slice(0, 5)) {
    const teacher = await login(account);
    const visible = await get('students?pageSize=100', teacher.accessToken);
    const expected = await db.student.findMany({
      where: {
        deletedAt: null,
        withdrawDate: null,
        memberships: { some: { group: { schedules: { some: { teacherId: teacher.user.id } } } } },
      },
      select: { id: true },
    });
    assert.deepEqual(visible.data.map((s) => s.id).sort(), expected.map((s) => s.id).sort());
    assert.ok(visible.meta.total > 0 && visible.meta.total < 100);
    const refreshed = await post('auth/refresh', null, { refreshToken: teacher.refreshToken }, 200);
    await post('auth/refresh', null, { refreshToken: teacher.refreshToken }, 401); // rotated
    await call('POST', 'auth/logout', {
      body: { refreshToken: refreshed.refreshToken },
      expect: 204,
    });
    await post('auth/refresh', null, { refreshToken: refreshed.refreshToken }, 401);
  }

  // --- Dormitory administrator is limited to own dormitory
  const dormAdmin = await login(accounts[6]);
  const dormId = dormAdmin.user.institutionId;
  const own = await get('students?pageSize=100', dormAdmin.accessToken);
  assert.ok(own.data.every((s) => s.institution.id === dormId));
  // Panelden eklenen gercek kayitlar sayimi degistirebilir; beklenen degeri veritabanindan al.
  const ownActive = await db.student.count({
    where: { institutionId: dormId, deletedAt: null, withdrawDate: null },
  });
  assert.ok(ownActive >= 25);
  assert.equal(own.meta.total, ownActive);
  const otherDorm = await db.institution.findFirstOrThrow({
    where: { id: { not: dormId }, code: { startsWith: 'DEMO-' } },
  });
  assert.equal(
    (await get(`students?institutionId=${otherDorm.id}`, dormAdmin.accessToken)).meta.total,
    0,
  );
  assert.equal((await get('dashboard', dormAdmin.accessToken)).stats.activeStudents, ownActive);

  // --- Cross-dormitory attendance by a teacher through sessions
  const teacher = await login(accounts[0]);
  const schedules = await get('schedules?pageSize=100', teacher.accessToken);
  const remote = schedules.data.find((s) => s.institution.id !== teacher.user.institutionId);
  assert.ok(remote, 'demo teacher needs a lesson in another dormitory');
  const week = { from: '2026-09-07', to: '2026-09-13' };
  const existingSessions = await db.sessionOccurrence.count({
    where: { scheduleId: remote.id, date: { gte: new Date(week.from), lte: new Date(week.to) } },
  });
  assert.equal(existingSessions, 0, 'test week already has sessions; refusing to touch them');
  const generated = await post(
    'sessions/generate',
    admin.accessToken,
    { ...week, scheduleId: remote.id },
    200,
  );
  assert.equal(generated.created, 1);
  const sessions = await get(
    `sessions?scheduleId=${remote.id}&from=${week.from}&to=${week.to}`,
    teacher.accessToken,
  );
  const session = sessions.data[0];
  cleanup.sessionIds.push(session.id);

  const allPresent = await post(
    `sessions/${session.id}/attendance/all-present`,
    teacher.accessToken,
    undefined,
    200,
  );
  assert.ok(allPresent.summary.rosterSize > 0);
  assert.equal(allPresent.summary.counts.PRESENT, allPresent.summary.rosterSize);
  const target = allPresent.students[0];
  const marked = await call('PUT', `sessions/${session.id}/attendance`, {
    token: teacher.accessToken,
    body: { entries: [{ studentId: target.student.id, status: 'LATE', note: 'smoke' }] },
  }).then((r) => r.body);
  const record = marked.students.find((s) => s.student.id === target.student.id).record;
  assert.equal(record.status, 'LATE');
  assert.equal(record.updatedBy.id, teacher.user.id);
  assert.equal(
    (await get(`attendance/${record.id}/history`, teacher.accessToken)).changes.length,
    1,
  );
  const audit = await db.auditLog.findFirstOrThrow({ where: { entityId: record.id } });
  assert.equal(audit.institutionId, remote.institution.id);
  await post(`sessions/${session.id}/cancel`, admin.accessToken, { reason: 'smoke' }, 409);
  await call('PUT', `sessions/${session.id}/attendance`, {
    token: teacher.accessToken,
    body: { entries: [{ studentId: own.data[0].id, status: 'PRESENT' }] },
    expect: 400,
  });
  assert.ok(Array.isArray((await get('sessions/today', teacher.accessToken)).lessons));

  const report = await get(
    `reports/teacher-attendance?from=${week.from}&to=${week.to}`,
    teacher.accessToken,
  );
  assert.equal(report.rows.length, 1);
  const csv = await call(
    'GET',
    `reports/student-attendance?from=${week.from}&to=${week.to}&format=csv`,
    { token: admin.accessToken },
  );
  assert.ok(csv.headers.get('content-type').startsWith('text/csv'));

  // --- Group transfer keeps history; program mismatch is reported per student
  const student = own.data[0];
  const fromGroup = student.groups[0];
  const detail = await get(`groups/${fromGroup.id}`, dormAdmin.accessToken);
  const tempGroup = await post('groups', dormAdmin.accessToken, {
    termId: detail.term.id,
    name: 'Smoke Test Grubu',
    scholarshipProgramId: detail.scholarshipProgram.id,
  });
  cleanup.groupIds.push(tempGroup.id);
  const original = await db.groupMembership.findFirstOrThrow({
    where: { studentId: student.id, groupId: fromGroup.id, effectiveTo: null },
  });
  cleanup.restoreMemberships.push(original.id);
  await post(`students/${student.id}/group-transfers`, dormAdmin.accessToken, {
    fromGroupId: fromGroup.id,
    toGroupId: tempGroup.id,
    effectiveDate: '2026-09-15',
  });
  const groupHistory = await get(`students/${student.id}/groups`, dormAdmin.accessToken);
  assert.equal(groupHistory.filter((m) => m.isActive).length, 1);
  assert.equal(groupHistory.find((m) => m.isActive).group.id, tempGroup.id);
  const otherProgramGroup = (await get('groups?pageSize=100', dormAdmin.accessToken)).data.find(
    (g) => g.scholarshipProgram && g.scholarshipProgram.id !== detail.scholarshipProgram.id,
  );
  const mismatch = await post(`groups/${otherProgramGroup.id}/members`, dormAdmin.accessToken, {
    studentIds: [student.id],
    effectiveFrom: '2026-09-15',
  });
  assert.equal(mismatch.added, 0);
  assert.match(mismatch.skipped[0].reason, /scholarship program/);

  // --- Excel import with template
  const template = await call('GET', 'students/import-template', { token: dormAdmin.accessToken });
  assert.ok(template.headers.get('content-type').includes('spreadsheetml'));
  const demoStudent = await db.student.findFirstOrThrow({
    where: {
      institutionId: dormId,
      id: { not: student.id },
      studentNumber: { startsWith: 'DEMO-' },
      memberships: { some: { effectiveTo: null } },
    },
    include: { scholarshipProgram: true, institution: true },
  });
  const otherProgram = await db.scholarshipProgram.findFirstOrThrow({
    where: { id: { not: demoStudent.scholarshipProgramId } },
  });
  const importNumber = `SMOKE-IMPORT-${Date.now()}`;
  cleanup.studentNumbers.push(importNumber);
  const gender = demoStudent.institution.gender === 'FEMALE' ? 'K' : 'E';
  const workbook = new Workbook();
  workbook.addWorksheet('Ogrenciler').addRows([
    ['Öğrenci No', 'Ad', 'Soyad', 'Cinsiyet', 'Burs Programı', 'Sınıf'],
    [importNumber, 'Test', 'Aktarim', gender, demoStudent.scholarshipProgram.code, 'Hazırlık'],
    [`${importNumber}-X`, 'Yanlis', 'Cinsiyet', gender === 'K' ? 'E' : 'K', '', ''],
    [
      demoStudent.studentNumber,
      demoStudent.firstName,
      demoStudent.lastName,
      gender,
      otherProgram.code,
      '',
    ],
  ]);
  const form = new FormData();
  form.append('file', new Blob([await workbook.xlsx.writeBuffer()]), 'ogrenciler.xlsx');
  const imported = await post('students/import', dormAdmin.accessToken, form, 200);
  assert.equal(imported.created, 1);
  assert.deepEqual(imported.errors, [
    'Satir 3: cinsiyet yurt ile uyusmuyor',
    'Satir 4: Close active group memberships before changing dormitory or program',
  ]);

  // --- Own password change (restored afterwards); returns a fresh token pair
  const temporary = `${accounts[6].password}-Yeni1`;
  const changed = await call('PATCH', 'auth/me/password', {
    token: dormAdmin.accessToken,
    body: { currentPassword: accounts[6].password, newPassword: temporary },
  }).then((r) => r.body);
  assert.ok(changed.accessToken);
  await call('PATCH', 'auth/me/password', {
    token: changed.accessToken,
    body: { currentPassword: temporary, newPassword: accounts[6].password },
  });

  // --- Student portal: account, forced password change, profile limits, schedule,
  //     homework with PDF, live event to the teacher, and account closure on deletion.
  const portalStudent = own.data.find((s) => s.id !== student.id && !s.account);
  assert.ok(portalStudent, 'needs a demo student without an account');
  cleanup.portal = {
    studentId: portalStudent.id,
    phone: portalStudent.phone ?? null,
    memberships: (
      await db.groupMembership.findMany({
        where: { studentId: portalStudent.id, effectiveTo: null },
        select: { id: true },
      })
    ).map((m) => m.id),
  };
  const firstPassword = 'Gecici-Sifre-2026';
  const account = await post(`students/${portalStudent.id}/account`, dormAdmin.accessToken, {
    password: firstPassword,
  });
  assert.equal(account.username, portalStudent.studentNumber.toLowerCase());
  assert.equal(account.mustChangePassword, true);
  await post(
    `students/${portalStudent.id}/account`,
    dormAdmin.accessToken,
    { password: firstPassword },
    409,
  );
  const pending = await login({ username: account.username, password: firstPassword });
  assert.equal(pending.user.role, 'STUDENT');
  assert.equal(pending.user.mustChangePassword, true);
  await get('portal/profile', pending.accessToken, 403);
  assert.equal((await get('auth/me', pending.accessToken)).mustChangePassword, true);
  const ownPassword = 'Ogrenci-Kendi-2026';
  const studentSession = await call('PATCH', 'auth/me/password', {
    token: pending.accessToken,
    body: { currentPassword: firstPassword, newPassword: ownPassword },
  }).then((r) => r.body);
  assert.equal(studentSession.user.mustChangePassword, false);
  const studentToken = studentSession.accessToken;

  const profile = await get('portal/profile', studentToken);
  assert.equal(profile.studentNumber, portalStudent.studentNumber);
  await call('PATCH', 'portal/profile', {
    token: studentToken,
    body: { studentNumber: 'HACK' },
    expect: 400,
  });
  const updatedProfile = await call('PATCH', 'portal/profile', {
    token: studentToken,
    body: { phone: '05551112233' },
  }).then((r) => r.body);
  assert.equal(updatedProfile.phone, '05551112233');
  await get('students', studentToken, 403);
  const portalSchedule = await get('portal/schedule', studentToken);
  assert.ok(portalSchedule.lessons.length > 0 && portalSchedule.lessons[0].teacher.name);
  assert.ok(Array.isArray((await get('portal/attendance', studentToken)).records));

  const lesson = await db.lessonSchedule.findFirstOrThrow({
    where: { id: portalSchedule.lessons[0].id },
    select: { id: true, teacher: { select: { email: true } } },
  });
  const lessonTeacher = await login(accounts.find((a) => a.email === lesson.teacher.email));
  const events = [];
  cleanup.abort = new AbortController();
  const stream = await fetch(`http://127.0.0.1:${port}/api/v1/events`, {
    headers: { Authorization: `Bearer ${lessonTeacher.accessToken}` },
    signal: cleanup.abort.signal,
  });
  assert.equal(stream.status, 200);
  void (async () => {
    const reader = stream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let end;
        while ((end = buffer.indexOf('\n\n')) >= 0) {
          const chunk = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          const type = /^event: (.+)$/m.exec(chunk)?.[1];
          const data = /^data: (.+)$/m.exec(chunk)?.[1];
          if (type) events.push({ type, data: data ? JSON.parse(data) : null });
        }
      }
    } catch {
      // stream aborted at the end of the test
    }
  })();

  const homework = await post('assignments', lessonTeacher.accessToken, {
    scheduleId: lesson.id,
    title: 'Smoke ödevi',
    allowText: true,
    allowFile: true,
  });
  cleanup.assignmentIds.push(homework.id);
  const studentHomework = await get('portal/assignments', studentToken);
  assert.ok(studentHomework.some((a) => a.id === homework.id && a.status === 'PENDING'));

  const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
  const answer = new FormData();
  answer.append('text', 'Cevabım');
  answer.append('file', new Blob([pdf], { type: 'application/pdf' }), 'cevap.pdf');
  const submission = await call('PUT', `portal/assignments/${homework.id}/submission`, {
    token: studentToken,
    body: answer,
  }).then((r) => r.body);
  assert.equal(submission.file.name, 'cevap.pdf');
  const fakePdf = new FormData();
  fakePdf.append('file', new Blob([Buffer.from('hello')], { type: 'application/pdf' }), 'x.pdf');
  await call('PUT', `portal/assignments/${homework.id}/submission`, {
    token: studentToken,
    body: fakePdf,
    expect: 400,
  });

  for (let i = 0; i < 40 && !events.some((e) => e.type === 'submission.saved'); i++) {
    await new Promise((resolve) => setTimeout(resolve, 125));
  }
  const live = events.find((e) => e.type === 'submission.saved');
  assert.ok(live, 'teacher did not receive the live submission event');
  assert.equal(live.data.studentId, portalStudent.id);
  const teacherView = await get(`assignments/${homework.id}`, lessonTeacher.accessToken);
  const answerRow = teacherView.students.find((s) => s.student.id === portalStudent.id);
  assert.equal(answerRow.submission.text, 'Cevabım');
  const download = await call(
    'GET',
    `assignments/${homework.id}/submissions/${portalStudent.id}/file`,
    { token: lessonTeacher.accessToken },
  );
  assert.equal(download.headers.get('content-type'), 'application/pdf');
  cleanup.abort.abort();

  await call('DELETE', `students/${portalStudent.id}`, {
    token: dormAdmin.accessToken,
    expect: 204,
  });
  await get('portal/profile', studentToken, 401);
  await post('auth/login', null, { email: account.username, password: ownPassword }, 401);

  console.log(
    'API smoke passed: health, auth (me/refresh rotation/logout/password), uniform errors, pagination, RLS visibility for teachers and dormitory admin, dashboard, session generation, cross-dormitory attendance with audit history, reports (json/csv), group transfer, Excel import, student portal (account, forced password change, profile limits, schedule, homework with PDF, live teacher event, closure on deletion).',
  );
}

main()
  .catch((error) => {
    console.error('API smoke failed: ' + error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    cleanup.abort?.abort();
    server.kill();
    await db.assignmentSubmission.deleteMany({
      where: { assignmentId: { in: cleanup.assignmentIds } },
    });
    await db.assignment.deleteMany({ where: { id: { in: cleanup.assignmentIds } } });
    if (cleanup.portal) {
      const studentUser = await db.user.findUnique({
        where: { studentId: cleanup.portal.studentId },
        select: { id: true },
      });
      if (studentUser) {
        await db.refreshToken.deleteMany({ where: { userId: studentUser.id } });
        await db.user.delete({ where: { id: studentUser.id } });
      }
      await db.student.update({
        where: { id: cleanup.portal.studentId },
        data: { deletedAt: null, withdrawDate: null, phone: cleanup.portal.phone },
      });
      await db.groupMembership.updateMany({
        where: { id: { in: cleanup.portal.memberships } },
        data: { effectiveTo: null },
      });
    }
    const records = await db.attendanceRecord.findMany({
      where: { sessionOccurrenceId: { in: cleanup.sessionIds } },
      select: { id: true },
    });
    await db.auditLog.deleteMany({ where: { entityId: { in: records.map((r) => r.id) } } });
    await db.attendanceRecord.deleteMany({
      where: { sessionOccurrenceId: { in: cleanup.sessionIds } },
    });
    await db.sessionOccurrence.deleteMany({ where: { id: { in: cleanup.sessionIds } } });
    await db.student.deleteMany({ where: { studentNumber: { in: cleanup.studentNumbers } } });
    await db.groupMembership.deleteMany({ where: { groupId: { in: cleanup.groupIds } } });
    await db.group.deleteMany({ where: { id: { in: cleanup.groupIds } } });
    await db.groupMembership.updateMany({
      where: { id: { in: cleanup.restoreMemberships } },
      data: { effectiveTo: null },
    });
    const users = await db.user.findMany({
      where: {
        OR: [
          { email: { in: accounts.map((a) => a.email).filter(Boolean) } },
          { username: { in: accounts.map((a) => a.username).filter(Boolean) } },
        ],
      },
      select: { id: true },
    });
    await db.refreshToken.updateMany({
      where: { userId: { in: users.map((u) => u.id) }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await db.$disconnect();
  });
