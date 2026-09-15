#!/usr/bin/env node
// Migration/deploy komutlarini DAIMA sema sahibi (MIGRATE_DATABASE_URL) ile calistirir.
// Neden bir script: ".env icindeki MIGRATE_DATABASE_URL'i DATABASE_URL'e ata" islemini
// dogrudan package.json script'i icinde "$MIGRATE_DATABASE_URL" seklinde yazmak calismaz,
// cunku o deger sadece .env dosyasinda vardir, kabugun (shell) kendi ortam degiskeni
// degildir - "$MIGRATE_DATABASE_URL" bos stringe genisler. Bu script .env'i once kendisi
// okur, sonra DATABASE_URL'i override edip prisma'yi cagirir.
require('dotenv').config();
process.env.DATABASE_URL = process.env.MIGRATE_DATABASE_URL;

const { spawnSync } = require('node:child_process');
const args = process.argv.slice(2);
if (!process.env.MIGRATE_DATABASE_URL) {
  console.error('MIGRATE_DATABASE_URL is required');
  process.exit(1);
}
const path = require('node:path');
const cli = path.join(path.dirname(require.resolve('prisma/package.json')), 'build/index.js');
const result = spawnSync(process.execPath, [cli, ...args], { stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
