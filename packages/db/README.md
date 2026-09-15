# @yoklama/db

Prisma semasi + coklu kurum izolasyonu icin Postgres Row-Level Security.

## Ilk kurulum sirasi (onemli)

RLS policy'leri schema.prisma DSL'i ile ifade edilemedigi icin **iki asamali** kurulur:

```bash
pnpm db:migrate      # 1) migration'lari olusturur/uygular (MIGRATE_DATABASE_URL/sema sahibi ile - app_runtime rolu henuz yok)
pnpm --filter @yoklama/db rls:apply   # 2) prisma/rls-policies.sql -> RLS rollerini/politikalarini kurar (bu adimda app_runtime rolu olusur)
pnpm db:seed         # 3) ornek gelistirme verisi
```

`migrate:dev`/`migrate:deploy` scriptleri **her zaman `MIGRATE_DATABASE_URL`'i kullanir** (DATABASE_URL'i o degerle gecici olarak override eder) - cunku ilk kurulumda `app_runtime` rolu henuz yoktur ve migration'lar sema sahibi rolle calismalidir. Bunu elle degistirmeyin.

Semada degisiklik yaptiginizda (yeni tablo/kolon) once `db:migrate` calistirin, RLS'e tabi yeni bir tablo eklediyseniz `rls-policies.sql` dosyasina o tabloyu da ekleyip `rls:apply`'i tekrar calistirin (script idempotent'tir, `DROP POLICY IF EXISTS` kullanir).

## Neden iki ayri veritabani rolu?

- `MIGRATE_DATABASE_URL` (sema sahibi): migration/seed/RLS kurulumu icin, RLS'i bypass eder.
- `DATABASE_URL` (`app_runtime` rolu): API'nin normal calisma zamaninda baglandigi, RLS'e tabi kisitli rol.

Uygulama kodu her zaman `withTenant()` (bkz. `src/index.ts`) uzerinden calismalidir - bu fonksiyon institution/actor context'ini bir transaction'a `SET LOCAL` ile yazar, boylece RLS policy'leri dogru satirlari filtreler.
