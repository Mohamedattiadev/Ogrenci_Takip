# Öğrenci Takip Sistemi

Yurt/kurum ogrenci yoklama takip sistemi: Flutter mobil uygulama (Android/iOS) + Next.js web yonetim paneli, ortak bir NestJS API ve PostgreSQL veritabani uzerinden calisir. Coklu kurum (multi-tenant) destegi Postgres Row-Level Security ile veritabani seviyesinde saglanir.

**Detayli mimari, yapilanlar/kalanlar checklist'i ve adim adim kurulum icin: [`PLAN.md`](./PLAN.md).** Mimari kararlarin gerekcesi icin: `docs/architecture/`.

## Klasor yapisi

```
apps/
  api/      NestJS backend (tek gercek API kaynagi)
  web/      Next.js yonetim paneli
  mobile/   Flutter uygulamasi
packages/
  db/              Prisma semasi, migration'lar, seed
  design-tokens/   Tek JSON kaynaktan Tailwind + Flutter tema uretimi
  shared-types/    API'nin OpenAPI spec'inden uretilen TS tipleri
  shared-dart/     API'nin OpenAPI spec'inden uretilen Dart/Dio client
infra/compose/     Gelistirme ve prod docker-compose dosyalari
```

## Gelistirmeye baslama

Detayli, adim-adim ve sorun giderme notlari icerern kurulum talimati **[`PLAN.md`](./PLAN.md)** dosyasindadir. Kisa ozet:

```bash
pnpm install

# .env dosyalari iki farkli yerde olmali - Prisma ve Nest her biri kendi
# klasorundeki .env'i okur, tek bir kok .env yeterli DEGIL:
cp .env.example packages/db/.env
cp .env.example apps/api/.env

docker compose -f infra/compose/docker-compose.dev.yml up -d
pnpm db:migrate        # tablolari olusturur
pnpm --filter @yoklama/db rls:apply   # RLS rollerini/politikalarini kurar
pnpm db:seed           # ornek veri
pnpm --filter @yoklama/api dev        # http://localhost:3001/docs
```
