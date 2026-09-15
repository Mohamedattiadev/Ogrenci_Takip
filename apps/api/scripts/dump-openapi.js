// API'nin OpenAPI spec'ini docs/api/openapi.json'a yazar. Bu dosya, hem
// packages/shared-types (TS tipleri) hem packages/shared-dart (Flutter client'i)
// icin TEK gercek kaynaktir - elle tip yazilmaz.
// Derlenmis koddan calisir (dist): Nest DI decorator metadata'sina ihtiyac duyar,
// tsx/esbuild bu metadata'yi uretmedigi icin TypeScript kaynagindan calistirilamaz.
require('reflect-metadata');
const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { NestFactory } = require('@nestjs/core');
const { VersioningType } = require('@nestjs/common');
const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');
const { AppModule } = require('../dist/app.module');

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Öğrenci Takip Sistemi API')
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );
  const outDir = join(__dirname, '../../../docs/api');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'openapi.json'), JSON.stringify(document, null, 2) + '\n');
  console.log(`OpenAPI spec yazildi: ${join(outDir, 'openapi.json')}`);
  await app.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
