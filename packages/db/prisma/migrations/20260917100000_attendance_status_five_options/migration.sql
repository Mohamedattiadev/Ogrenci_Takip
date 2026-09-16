-- Yoklama durumlarini bese indirir: Geldi, Gelmedi, Izinli, Gec Geldi, Haberli Devamsizlik.
-- "Habersiz Devamsizlik" (ABSENT_UNEXCUSED) kaldirildi; var olan kayitlar genel "Gelmedi"
-- (ABSENT) durumuna tasinir. Postgres enum'dan deger silmeyi desteklemedigi icin sutun
-- gecici olarak text'e alinip yeni enum ile degistirilir.

ALTER TABLE "AttendanceRecord" ALTER COLUMN "status" TYPE TEXT;

UPDATE "AttendanceRecord" SET "status" = 'ABSENT' WHERE "status" = 'ABSENT_UNEXCUSED';

DROP TYPE "AttendanceStatus";

CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED', 'LATE', 'ABSENT_EXCUSED');

ALTER TABLE "AttendanceRecord"
  ALTER COLUMN "status" TYPE "AttendanceStatus" USING "status"::"AttendanceStatus";
