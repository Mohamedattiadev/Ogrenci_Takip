// Local HTTP integration check against demo data. No passwords or tokens are printed.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const root = path.resolve(__dirname, '..');
const apiRoot = path.resolve(root, '../../apps/api');
const env = dotenv.parse(fs.readFileSync(path.join(root, '.env')));
const db = new PrismaClient({ datasourceUrl: env.MIGRATE_DATABASE_URL });
const accounts = JSON.parse(fs.readFileSync(path.join(root, 'demo-accounts.local.json')));
const port = 3197;
const server = spawn(process.execPath, ['dist/main.js'], {
  cwd: apiRoot,
  env: { ...process.env, API_PORT: String(port) },
  stdio: 'ignore',
  windowsHide: true,
});
async function request(route, token, body) {
  const response = await fetch(`http://127.0.0.1:${port}/api/v1/${route}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  assert.ok(response.ok, `${route}: HTTP ${response.status}`);
  return response.json();
}
async function main() {
  let ready = false;
  for (let i = 0; i < 40; i++) {
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
  const adminLogin = await request('auth/login', null, {
    email: admin.email,
    password: admin.password,
  });
  const students = await request('students', adminLogin.accessToken);
  assert.equal(students.filter((s) => s.studentNumber.startsWith('DEMO-')).length, 100);
  assert.equal(students.filter((s) => s.gender === 'FEMALE').length, 50);
  assert.equal(students.filter((s) => s.gender === 'MALE').length, 50);
  assert.equal((await request('scholarships', adminLogin.accessToken)).length, 6);
  for (const teacher of accounts.slice(0, 5)) {
    const login = await request('auth/login', null, {
      email: teacher.email,
      password: teacher.password,
    });
    const visible = await request('students', login.accessToken);
    const expected = await db.student.findMany({
      where: {
        memberships: { some: { group: { schedules: { some: { teacherId: login.user.id } } } } },
      },
      select: { id: true },
    });
    assert.deepEqual(visible.map((s) => s.id).sort(), expected.map((s) => s.id).sort());
    const refreshed = await request('auth/refresh', null, { refreshToken: login.refreshToken });
    assert.ok(refreshed.accessToken);
    assert.ok(visible.length > 0 && visible.length < 100);
  }
  console.log(
    'API smoke passed: admin sees 100 students (50 female / 50 male), 6 programs; all 5 teachers see exactly their assigned students; login/refresh works.',
  );
}
main()
  .catch((error) => {
    console.error('API smoke failed: ' + error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    server.kill();
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
