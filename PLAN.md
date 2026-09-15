# Öğrenci Takip Sistemi — Mimari & Uygulama Planı (v1)

## 0. Durum Özeti

### Tamamlanan ve gerçek veritabanına karşı test edilmiş

- [x] Monorepo iskeleti (pnpm workspaces + Turborepo)
- [x] `packages/design-tokens` — tek JSON kaynaktan Tailwind preset + Flutter tema üretimi
- [x] `packages/db` — Prisma şeması, migration'lar, Postgres Row-Level Security politikaları, seed script
- [x] `apps/api` — kimlik doğrulama (JWT + bcrypt + refresh token)
- [x] `apps/api` — rol bazlı yetkilendirme (CASL)
- [x] `apps/api` — kurum (institutions) modülü
- [x] `apps/api` — öğrenci (students) modülü + Excel toplu aktarım + QR kod token üretimi
- [x] `apps/api` — grup (groups) modülü + grup değişikliği geçmişi
- [x] `apps/api` — ders (courses) modülü
- [x] `apps/api` — ders programı (schedule) modülü + tatil takvimi + iptal/telafi
- [x] `apps/api` — yoklama (attendance) modülü + toplu işaretleme + QR ile yoklama + düzeltme geçmişi
- [x] `apps/api` — raporlama (reports) modülü + CSV/Excel/PDF export + haftalık trend + en çok devamsız öğrenciler + öğretmen yoklama-girişi uyumu
- [x] `apps/api` — veli bildirimleri (notifications) modülü + olay güdümlü tetikleme + e-posta kanalı çalışıyor + SMS kanalı (sağlayıcı bekleyen yer tutucu)
- [x] `apps/api` — kullanıcı (users) modülü
- [x] `apps/api` — audit log modülü
- [x] `infra/compose/docker-compose.dev.yml` — geliştirme ortamı Postgres
- [x] `.github/workflows/ci.yml` — lint + typecheck + build otomatik kontrolü
- [x] Husky pre-commit (lint-staged) + commit-msg (commitlint) hook'ları
- [x] Uçtan uca gerçek test: giriş, RBAC, RLS kurum izolasyonu, yoklama akışı, QR tarama, veli bildirimi eşiği, CSV rapor export'u, `pnpm lint`/`typecheck`/`build` tam pipeline

### Kalan (henüz yapılmadı)

- [ ] `apps/web` — Next.js yönetim paneli (hiç scaffold edilmedi)
- [ ] `apps/mobile` — Flutter uygulaması (hiç scaffold edilmedi)
- [ ] `packages/shared-types` — gerçek OpenAPI'den üretilmiş TS tipleri (şu an sadece README/placeholder)
- [ ] `packages/shared-dart` — gerçek OpenAPI'den üretilmiş Dart/Dio client (şu an sadece README/placeholder)
- [ ] Gerçek SMS sağlayıcı entegrasyonu (Netgsm/Twilio/İletimerkezi — TDV seçince tek dosya değişecek: `apps/api/src/notifications/channels/sms-channel.ts`)
- [ ] Otomatik yedekleme scripti (pg_dump cron) — infra dokümante edildi ama script henüz yazılmadı

---

## 1. Bağlam

Türkiye Diyanet Vakfı'na bağlı **10'dan fazla yurtta** verilen takviye derslerinin yoklama takibi için bir sistem. Üç parça, tek merkezi veritabanı:

- **Flutter mobil uygulama** (Android + iOS) — öğretmenler dersten yoklama alır, zayıf/yok internette de çalışır.
- **Next.js web paneli** — yurt/kurum yöneticileri ve sistem yöneticisi için yönetim/raporlama.
- **PostgreSQL** — her iki istemcinin de tek bir NestJS API üzerinden eriştiği ortak veri katmanı.

**v1 kapsamına dahil edilenler** (başlangıçta v2'ye bırakılması düşünülmüş, sonradan v1'e alınmıştır):

- Veli bildirimleri (devamsızlık + eşik uyarısı)
- QR ile yoklama (öğrenci kartı okutarak)
- Gelişmiş analiz (haftalık trend, en çok devamsız öğrenciler, öğretmen yoklama-girişi uyumu)

**v2'ye bırakılan**: gerçek bir SMS sağlayıcı entegrasyonu (altyapı hazır, sadece sağlayıcı seçimi ve API anahtarı bekleniyor), ödeme sistemi.

---

## 2. Mimari kararlar (gerekçeleriyle)

| Karar                                                             | Gerekçe                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Modüler monolit (NestJS), mikroservis değil                       | 10-20 kurum / birkaç bin öğrenci ölçeği mikroservisin bedelini (dağıtık deploy/veri) haklı çıkarmıyor. Modüller kendi tablolarının sahibi — ileride gerekirse ayrıştırmak refactor olur, yeniden yazım olmaz.                                          |
| Postgres Row-Level Security ile çoklu-kurum izolasyonu            | Uygulama kodunun disiplinine (`WHERE institutionId = ...`) güvenmek yerine, izolasyon veritabanı motorunda garanti altında. Bkz. `docs/architecture/adrs/0002-multi-tenant-rls.md`.                                                                    |
| Basit JWT + bcrypt + CASL (RBAC)                                  | v1 için orantılı; self-hosted OIDC (Zitadel/Keycloak) ekstra altyapı yükü getirirdi. Rol→yetki eşlemesi tek dosyada (`apps/api/src/auth/ability.factory.ts`) — TDV ile görüşme sonrası "öğretmen şunu da yapabilsin" değişiklikleri buradan yönetilir. |
| OpenAPI sözleşme-öncelikli API                                    | `apps/api` → `docs/api/openapi.json` → hem web (TS tipleri) hem mobil (Dart client) buradan üretilir. Elle tip yazılmaz, sözleşme sürüklenmesi engellenir.                                                                                             |
| Flutter: Drift + Outbox deseni (offline-first, henüz uygulanmadı) | Öğretmen internetsiz yoklama alır, bağlantı gelince otomatik senkronize olur (Command pattern: her işlem kuyruğa yazılır, `Draft→Queued→Syncing→Synced` durumlarından geçer).                                                                          |
| Tek kaynaklı tasarım tokenları                                    | `packages/design-tokens/src/tokens.json` → Tailwind preset + Flutter tema otomatik üretilir. TDV'nin gerçek marka rengi geldiğinde tek dosya güncellenir.                                                                                              |
| Bildirimler: Observer (event-driven)                              | `AttendanceService` bir "devamsızlık" olayını yayınlar (`@nestjs/event-emitter`), `NotificationsService` bunu dinler — modüller birbirine bağımlı değil. Kanal seçimi (e-posta/SMS) Strategy pattern.                                                  |

---

## 3. Veritabanı şeması

Bkz. `packages/db/prisma/schema.prisma` (yorumlu, kendini açıklıyor) ve `packages/db/prisma/rls-policies.sql`. Öne çıkanlar:

- **Grup değişikliği geçmişi**: `Student.groupId` diye tek bir mutable alan yok — `GroupMembership(effectiveFrom, effectiveTo)` ile "bu öğrenci X tarihinde hangi gruptaydı" sorgusu her zaman cevaplanabilir.
- **Yoklama durumları**: 6 bağımsız durum — `PRESENT, ABSENT, EXCUSED, LATE, ABSENT_EXCUSED, ABSENT_UNEXCUSED`.
- **Soft delete** + kısmi unique index (`Student.studentNumber`, sadece `deletedAt IS NULL` kayıtlar arasında benzersiz — ayrılan bir öğrenci numarası yeniden kullanılabilir).
- **Notification** tablosu: her veli bildirimi denemesi (kanal, durum, hata) kaydedilir — görünürlük + audit.
- **Önemli**: Prisma `String @id` alanları Postgres'te `TEXT` olarak üretilir, native `uuid` DEĞİL. `rls-policies.sql`'deki tüm yardımcı fonksiyonlar (`app_current_institution()`, `app_auth_lookup()`) bu yüzden `text` tipinde — eğer şemaya native `uuid` tipli bir alan eklerseniz bu fonksiyonları güncellemeniz gerekir.

---

## 4. Backend (`apps/api`) — durum: **tamamlandı, uçtan uca test edildi**

Modüller: `auth`, `users`, `institutions`, `groups` (AcademicTerm dahil), `students`, `courses`, `schedule`, `attendance`, `reports`, `notifications`, `audit`.

### Kurulum (adım adım — sırayı değiştirmeyin)

**Ön koşullar:**

- Node.js **20 veya üzeri** (`node -v` ile kontrol edin)
- pnpm **9 veya üzeri** (`npm i -g pnpm` veya `corepack enable`)
- Docker + Docker Compose
- `psql` istemcisi (RLS SQL'ini uygulamak için) — Ubuntu/Debian: `sudo apt install postgresql-client`, macOS: `brew install libpq && brew link --force libpq`

**Adımlar:**

```bash
# 1) Bağımlılıklar
pnpm install

# 2) Ortam değişkenleri — İKİ AYRI .env dosyası gerekir, tek bir kök .env YETMEZ:
#    Prisma CLI packages/db/.env'i okur, Nest (apps/api) kendi klasöründeki .env'i okur.
cp .env.example packages/db/.env
cp .env.example apps/api/.env
# Not: .env.example'daki varsayılan port 5432'dir. Eğer makinenizde 5432 zaten
# kullanılıyorsa (başka bir proje/Postgres kurulu ise), her iki .env dosyasında
# DATABASE_URL/MIGRATE_DATABASE_URL'deki portu değiştirin (ör. 5442) VE aşağıdaki
# docker compose komutunu da POSTGRES_PORT=5442 ile çalıştırın.

# 3) Postgres'i ayağa kaldır
docker compose -f infra/compose/docker-compose.dev.yml up -d
# Port çakışması varsa: POSTGRES_PORT=5442 docker compose -f infra/compose/docker-compose.dev.yml up -d

# 4) Şema migration'ı (sema-sahibi rolle otomatik çalışır, app_runtime henüz yok)
pnpm db:migrate

# 5) Row-Level Security rollerini ve politikalarını kur (bu adım app_runtime rolünü de oluşturur)
pnpm --filter @yoklama/db rls:apply

# 6) Örnek geliştirme verisi
pnpm db:seed

# 7) API'yi başlat
pnpm --filter @yoklama/api dev
```

API ayağa kalkınca: **http://localhost:3001/api/v1** (Swagger dokümantasyonu: **http://localhost:3001/docs**).

Seed kullanıcılar (şifre hepsinde `Deneme123!`):

- `sistem.yoneticisi@example.org` (SUPER_ADMIN — tüm kurumları görür)
- `kurum.yoneticisi@example.org` (INSTITUTION_ADMIN — sadece "MERKEZ" kurumu)
- `ogretmen@example.org` (TEACHER — sadece kendi dersleri)

### Sık karşılaşılabilecek sorunlar (gerçekten karşılaşıldı, çözümü test edildi)

| Belirti                                                    | Sebep                                                                                | Çözüm                                                                                                                                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker compose up` sırasında "port is already allocated"  | Makinede zaten 5432'de başka bir Postgres/proje çalışıyor                            | `POSTGRES_PORT=5442 docker compose -f infra/compose/docker-compose.dev.yml up -d` ve her iki `.env` dosyasında portu 5442 yapın                                                                                 |
| `pnpm db:migrate` → "Authentication failed... app_runtime" | Migration adımı henüz var olmayan `app_runtime` rolüyle bağlanmaya çalışıyor         | Zaten düzeltildi — `migrate:dev`/`migrate:deploy` scriptleri `packages/db/scripts/with-owner-url.js` üzerinden **her zaman** `MIGRATE_DATABASE_URL` (sema sahibi) ile çalışır. Elle `DATABASE_URL` set etmeyin. |
| Giriş (`/auth/login`) 500 hatası veriyor                   | RLS SQL'i henüz uygulanmamış (`app_auth_lookup` fonksiyonu yok)                      | Adım 5'i (`rls:apply`) atlamayın                                                                                                                                                                                |
| Öğretmen `/attendance/occurrence/:id` çağırınca 403 alıyor | Bilinen bir hataydı, düzeltildi                                                      | Güncel koddaysanız sorun olmamalı — `ability.factory.ts`'de `TEACHER` rolünün `AttendanceRecord` üzerinde `read` yetkisi var                                                                                    |
| `tx.$transaction is not a function` hatası                 | Prisma'nın interaktif transaction client'ı içinde ikinci bir `$transaction` açılamaz | Zaten düzeltildi (`attendance.service.ts`, `students.service.ts`) — yeni kod eklerken `withTenant()` içinde tekrar `tx.$transaction(...)` çağırmayın, doğrudan `tx` üzerinden sırayla yazın                     |

---

## 5. Sırada ne var (bu plan burada implement edilecek)

1. **Web paneli** (`apps/web`, Next.js) — shadcn/ui + Tailwind + `packages/design-tokens` preset'i, sayfalar: login, dashboard, students, groups, schedule, attendance, reports, users, settings. Renk paleti gerçek TDV DBYS portalından türetilecek (bkz. `packages/design-tokens/README.md`).
2. **Mobil uygulama** (`apps/mobile`, Flutter) — Riverpod + Drift + Outbox senkronizasyon, ekranlar: giriş, ana sayfa, yoklama al (+ QR tarama), öğrenci devam durumu, ayarlar.
3. **API sözleşme üretimi**: `pnpm --filter @yoklama/api openapi:dump` çalıştırıldıktan sonra `shared-types` ve `shared-dart` paketleri gerçek içerikle doldurulacak.
4. **SMS sağlayıcısı**: TDV bir sağlayıcı seçip API bilgilerini paylaştığında `apps/api/src/notifications/channels/sms-channel.ts` gerçek bir HTTP çağrısına dönüştürülecek.

---

## 6. Sonradan netleşecek noktalar (TDV sorumlusuyla görüşme sonrası)

Mimari şu noktalarda kasıtlı esnek bırakıldı:

- Rol bazlı yetkiler → `apps/api/src/auth/ability.factory.ts` (tek dosya, controller'lar değişmez).
- Devamsızlık eşiği → `ABSENCE_ALERT_THRESHOLD` env değişkeni.
- Rapor içerikleri → `apps/api/src/reports/reports.service.ts`'e yeni bir sorgu/export eklemek yeterli.
