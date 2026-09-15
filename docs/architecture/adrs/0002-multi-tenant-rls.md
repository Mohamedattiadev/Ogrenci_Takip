# ADR-0002: Çoklu kurum izolasyonu için Postgres Row-Level Security

## Bağlam

Sistem baştan 10+ yurt/kurumu tek bir veritabanında barındıracak. Bir kurumun verisinin (öğrenci, yoklama, program) bir başka kuruma asla sızmaması gerekiyor. Vakfın ileride sistemi başka amaçlarla (ör. personel takibi) da kullanma ihtimali var — izolasyon mekanizması en baştan sağlam kurulmalı, sonradan eklemek çok daha maliyetli olurdu.

## Karar

- Paylaşımlı şema (shared-schema) + her kurum-sahipli tabloda `institutionId` (fragmentation key).
- **Uygulama kodunun disiplinine bırakmak yerine**, izolasyon Postgres **Row-Level Security** ile veritabanı seviyesinde zorunlu kılınır (bkz. `packages/db/prisma/rls-policies.sql`).
- İki veritabanı rolü: kısıtlı `app_runtime` (RLS'e tabi, API'nin çalışma zamanı bağlantısı) ve sema-sahibi rol (migration/seed, RLS'i bypass eder).
- Her istek bir Prisma transaction'ı içinde `SET LOCAL app.institution_id`, `app.actor_id`, `app.is_superadmin` ayarlar (`packages/db/src/index.ts` → `withTenant()`); policy'ler bu session değişkenlerine göre satırları filtreler.

## Gerekçe

Uygulama-seviyesi tenant scoping (her repository metodunda elle `WHERE institutionId = ...`) gerçek dünyada en sık rastlanan multi-tenant veri sızıntısı sebebidir — bir geliştiricinin unuttuğu tek bir filtre yeterlidir. RLS + `FORCE ROW LEVEL SECURITY`, bunu veritabanı motorunun garanti ettiği bir kurala çevirir; uygulama kodu hata yapsa bile veri sızmaz.

## Sonuçlar

- Yeni bir kurum-sahipli tablo eklenince şemaya `institutionId` eklenmeli VE `rls-policies.sql`'e karşılık gelen policy eklenmeli (kontrol listesi: PR review'da hatırlatılmalı).
- `SUPER_ADMIN` rolü `app_is_superadmin()` ile tüm kurumları görebilir (TDV merkez kullanımı için).
- Doğrudan `institutionId` taşımayan çocuk tablolar (ör. `AttendanceRecord`) üst tablo üzerinden `EXISTS` alt sorgusuyla scope edilir.
