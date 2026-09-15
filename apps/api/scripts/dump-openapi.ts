import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

/**
 * API'nin OpenAPI spec'ini docs/api/openapi.json'a yazar. Bu dosya, hem
 * packages/shared-types (TS tipleri) hem packages/shared-dart (Flutter
 * client'i) icin TEK gercek kaynaktir - elle tip yazilmaz.
 */
async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('Yoklama Sistemi API').setVersion('1.0').addBearerAuth().build(),
  );
  const outPath = join(__dirname, '../../../docs/api/openapi.json');
  writeFileSync(outPath, JSON.stringify(document, null, 2));
  console.log(`OpenAPI spec yazildi: ${outPath}`);
  await app.close();
}

main();
