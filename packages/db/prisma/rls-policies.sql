-- Coklu kurum (multi-tenant) izolasyonu: Postgres Row-Level Security.
--
-- Neden: uygulama kodunda "her sorguya institutionId ekle" kuralina guvenmek
-- yerine, izolasyonu veritabani seviyesinde garanti altina aliyoruz. Tek bir
-- unutulmus WHERE kosulu artik farkli bir yurdun/kurumun verisini sizdiramaz.
--
-- Nasil calisir: uygulama her istekte (bir transaction icinde) iki oturum
-- degiskeni ayarlar: app.institution_id ve app.is_superadmin (bkz.
-- packages/db/src/index.ts -> withTenant()). Asagidaki policy'ler bu
-- degiskenlere gore satirlari filtreler.
--
-- Bu dosya `prisma migrate dev --name init` ile olusturulan ilk migration
-- UYGULANDIKTAN SONRA calistirilmalidir (schema.prisma DSL'i RLS/policy
-- ifade edemedigi icin elle yazilir). Calistirma:
--   psql "$MIGRATE_DATABASE_URL" -f prisma/rls-policies.sql
-- veya: pnpm --filter @yoklama/db rls:apply

-- --- Roller ---
-- Sema sahibi rol (MIGRATE_DATABASE_URL) RLS'i bypass eder (migration/seed icin).
-- Calisma zamani rolu (DATABASE_URL) RLS'e tabidir.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime LOGIN PASSWORD 'app_runtime_pw' NOBYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime;

-- Audit log: sadece ekleme/okuma, degistirme/silme yok (append-only).
REVOKE UPDATE, DELETE ON "AuditLog" FROM app_runtime;

-- --- Yardimci fonksiyonlar ---
-- Not: Prisma id/foreign-key kolonlarini native "uuid" degil "text" olarak
-- uretiyor (varsayilan String @id davranisi) - fonksiyonlar buna gore text
-- donduruyor, aksi halde "operator does not exist: text = uuid" hatasi alinir.
-- Not: eger bu fonksiyonun donus tipini degistirmeniz gerekirse (nadir), once
-- `DROP FUNCTION app_current_institution() CASCADE;` ile bagli policy'leri
-- dusurup bu dosyayi tekrar calistirmalisiniz - normal calistirmada DROP
-- YOK, cunku tum tenant_isolation policy'leri bu fonksiyona bagli.
CREATE OR REPLACE FUNCTION app_current_institution() RETURNS text AS $$
  SELECT nullif(current_setting('app.institution_id', true), '')
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_is_superadmin() RETURNS boolean AS $$
  SELECT coalesce(nullif(current_setting('app.is_superadmin', true), ''), 'false')::boolean
$$ LANGUAGE sql STABLE;

-- --- Institution: sistem yoneticisi hepsini gorur, digerleri sadece kendi kurumunu ---
ALTER TABLE "Institution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Institution" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Institution";
CREATE POLICY tenant_isolation ON "Institution"
  USING (app_is_superadmin() OR id = app_current_institution());

-- --- Dogrudan institutionId tasiyan tablolar (zorunlu alan) ---
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['User', 'AcademicTerm', 'Group', 'Student', 'Course', 'LessonSchedule', 'Notification']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (app_is_superadmin() OR "institutionId" = app_current_institution())',
      tbl
    );
  END LOOP;
END
$$;

-- --- institutionId'si NULL olabilen tablolar (null = tum kurumlar icin gecerli) ---
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['Holiday', 'AuditLog']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (app_is_superadmin() OR "institutionId" IS NULL OR "institutionId" = app_current_institution())',
      tbl
    );
  END LOOP;
END
$$;

-- --- Dogrudan institutionId olmayan, ust tablo uzerinden kurum sahipli tablolar ---
ALTER TABLE "GroupMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GroupMembership" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "GroupMembership";
CREATE POLICY tenant_isolation ON "GroupMembership"
  USING (
    app_is_superadmin() OR EXISTS (
      SELECT 1 FROM "Group" g WHERE g.id = "GroupMembership"."groupId"
        AND g."institutionId" = app_current_institution()
    )
  );

ALTER TABLE "SessionOccurrence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SessionOccurrence" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SessionOccurrence";
CREATE POLICY tenant_isolation ON "SessionOccurrence"
  USING (
    app_is_superadmin() OR EXISTS (
      SELECT 1 FROM "LessonSchedule" ls WHERE ls.id = "SessionOccurrence"."scheduleId"
        AND ls."institutionId" = app_current_institution()
    )
  );

ALTER TABLE "AttendanceRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceRecord" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "AttendanceRecord";
CREATE POLICY tenant_isolation ON "AttendanceRecord"
  USING (
    app_is_superadmin() OR EXISTS (
      SELECT 1 FROM "Student" s WHERE s.id = "AttendanceRecord"."studentId"
        AND s."institutionId" = app_current_institution()
    )
  );

-- --- Auth login: institution context henuz bilinmedigi icin (henuz giris
-- yapilmadi) normal RLS ile User satiri bulunamaz. Bunun icin dar kapsamli
-- bir SECURITY DEFINER fonksiyonu kullaniyoruz - sadece login'in ihtiyac
-- duydugu kolonlari dondurur, genel bir "User tablosunu email ile ac" kapisi
-- degildir (referans projedeki push-notification SECURITY DEFINER desenine benzer).
DROP FUNCTION IF EXISTS app_auth_lookup(text);
CREATE OR REPLACE FUNCTION app_auth_lookup(p_email text)
RETURNS TABLE (
  id text,
  "passwordHash" text,
  role text,
  "institutionId" text,
  "isActive" boolean
)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, "passwordHash", role::text, "institutionId", "isActive"
  FROM "User"
  WHERE email = p_email AND "deletedAt" IS NULL
$$ LANGUAGE sql STABLE;

REVOKE ALL ON FUNCTION app_auth_lookup(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_auth_lookup(text) TO app_runtime;

-- --- Ogrenci numarasi: soft-delete sonrasi ayni numaranin yeniden kullanilabilmesi
-- icin TAM unique degil, sadece aktif (deletedAt IS NULL) kayitlar arasinda unique.
DROP INDEX IF EXISTS student_number_unique_active;
CREATE UNIQUE INDEX student_number_unique_active
  ON "Student" ("institutionId", "studentNumber")
  WHERE "deletedAt" IS NULL;
