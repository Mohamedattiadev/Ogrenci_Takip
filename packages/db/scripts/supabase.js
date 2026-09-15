// Run from any directory: node packages/db/scripts/supabase.js check|setup|verify
// Secrets are read from ignored local .env files and never passed as CLI arguments.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');
const root = path.resolve(__dirname, '..');
const envFile = path.join(root, '.env');
const env = dotenv.parse(fs.readFileSync(envFile));
const cli = path.join(path.dirname(require.resolve('prisma/package.json')), 'build/index.js');

function run(args, url, input) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: url },
    input,
    encoding: 'utf8',
    timeout: 120000,
  });
  if (result.status !== 0) {
    // Prisma may echo connection details. Return only a diagnostic code.
    let output = (result.stdout || '') + (result.stderr || '');
    for (const value of [env.MIGRATE_DATABASE_URL, env.DATABASE_URL, url].filter(Boolean)) {
      for (const secret of [
        value,
        new URL(value).password,
        decodeURIComponent(new URL(value).password),
      ].filter(Boolean)) {
        output = output.split(secret).join('[REDACTED]');
      }
    }
    output = output.replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[REDACTED URL]');
    throw new Error(
      `Database command failed: ${output.slice(-2000) || result.error?.code || 'unknown error'}`,
    );
  }
}
function sql(text, url = env.MIGRATE_DATABASE_URL) {
  run(['db', 'execute', '--stdin', '--schema', 'prisma/schema.prisma'], url, text);
}
function saveEnv(file, updates) {
  const current = fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {};
  Object.assign(current, updates);
  fs.writeFileSync(
    file,
    Object.entries(current)
      .map(([k, v]) => `${k}="${v}"`)
      .join('\n') + '\n',
  );
}

try {
  if (!env.MIGRATE_DATABASE_URL)
    throw new Error('MIGRATE_DATABASE_URL is required in packages/db/.env');
  const command = process.argv[2] || 'check';
  if (command === 'check') {
    sql('SELECT 1;');
    console.log('Supabase administrator connection OK.');
  } else if (command === 'setup') {
    const owner = new URL(env.MIGRATE_DATABASE_URL);
    if (
      !owner.hostname.endsWith('.pooler.supabase.com') ||
      !owner.username.startsWith('postgres.')
    ) {
      throw new Error('Setup requires the Supabase postgres Session pooler URL.');
    }
    let password;
    if (env.DATABASE_URL) {
      const existing = new URL(env.DATABASE_URL);
      if (
        existing.hostname !== owner.hostname ||
        existing.username !== owner.username.replace(/^postgres\./, 'app_runtime.')
      )
        throw new Error('Existing runtime URL belongs to a different project.');
      password = decodeURIComponent(existing.password);
    } else {
      password = crypto.randomBytes(32).toString('hex');
      owner.username = owner.username.replace(/^postgres\./, 'app_runtime.');
      owner.password = password;
      env.DATABASE_URL = owner.href;
      saveEnv(envFile, { DATABASE_URL: env.DATABASE_URL });
    }
    if (!/^[a-f0-9]{64}$/.test(password))
      throw new Error('Setup expects a generated runtime password.');
    sql(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='app_runtime') THEN CREATE ROLE app_runtime LOGIN NOBYPASSRLS; END IF; END $$;
      ALTER ROLE app_runtime PASSWORD '${password}';
      DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='app_runtime' AND (rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole)) THEN RAISE EXCEPTION 'Runtime role has excessive privileges'; END IF; END $$;
      GRANT app_runtime TO postgres;`);
    run(['migrate', 'deploy'], env.MIGRATE_DATABASE_URL);
    sql(
      'BEGIN;\n' +
        fs.readFileSync(path.join(root, 'prisma/rls-policies.sql'), 'utf8') +
        '\n' +
        fs.readFileSync(path.join(root, 'prisma/dormitory-policies.sql'), 'utf8') +
        '\nCOMMIT;',
    );
    sql(
      "DO $$ BEGIN IF current_user <> 'app_runtime' THEN RAISE EXCEPTION 'Wrong runtime role'; END IF; END $$;",
      env.DATABASE_URL,
    );
    const apiEnv = path.resolve(root, '../../apps/api/.env');
    const existingApi = fs.existsSync(apiEnv) ? dotenv.parse(fs.readFileSync(apiEnv)) : {};
    saveEnv(apiEnv, {
      DATABASE_URL: env.DATABASE_URL,
      JWT_ACCESS_SECRET: existingApi.JWT_ACCESS_SECRET || crypto.randomBytes(48).toString('hex'),
      JWT_REFRESH_SECRET: existingApi.JWT_REFRESH_SECRET || crypto.randomBytes(48).toString('hex'),
      QR_TOKEN_SECRET: existingApi.QR_TOKEN_SECRET || crypto.randomBytes(48).toString('hex'),
      API_PORT: existingApi.API_PORT || '3001',
      NODE_ENV: existingApi.NODE_ENV || 'development',
      CORS_ORIGIN: existingApi.CORS_ORIGIN || 'http://localhost:3000',
    });
    console.log(
      'Migrations, RLS and restricted API connection installed. No sample accounts created.',
    );
  } else if (command === 'verify') {
    sql(fs.readFileSync(path.join(root, 'tests/relationships.sql'), 'utf8'));
    sql(
      "DO $$ BEGIN IF current_user <> 'app_runtime' OR (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname=current_user) THEN RAISE EXCEPTION 'Unsafe role'; END IF; IF EXISTS (SELECT 1 FROM \"Student\") THEN RAISE EXCEPTION 'Missing-context isolation failed'; END IF; END $$;",
      env.DATABASE_URL,
    );
    console.log('Relationship and RLS regression checks passed; fixtures rolled back.');
  } else throw new Error('Use check, setup or verify.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
