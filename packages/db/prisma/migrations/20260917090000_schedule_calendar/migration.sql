BEGIN;

ALTER TABLE "LessonSchedule"
  ADD COLUMN "startDate" DATE,
  ADD COLUMN "endDate" DATE,
  ADD COLUMN "breaks" JSONB NOT NULL DEFAULT '[]';

UPDATE "LessonSchedule" s SET "startDate" = t."startDate"::date, "endDate" = t."endDate"::date
FROM "Group" g JOIN "AcademicTerm" t ON t.id = g."termId" WHERE s."groupId" = g.id;

ALTER TABLE "LessonSchedule" ADD CONSTRAINT "schedule_date_order"
CHECK (("startDate" IS NULL AND "endDate" IS NULL) OR
       ("startDate" IS NOT NULL AND "endDate" IS NOT NULL AND "startDate" <= "endDate"));

-- Existing schedules retain their term dates and become available in the attendance picker.
INSERT INTO "SessionOccurrence" (id, "scheduleId", date, "isCancelled", "isMakeup")
SELECT gen_random_uuid()::text, s.id, d.day, false, false
FROM "LessonSchedule" s
JOIN "Group" g ON g.id = s."groupId"
CROSS JOIN LATERAL generate_series(
  GREATEST(s."startDate", (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Istanbul')::date)::timestamp,
  s."endDate"::timestamp, interval '1 day'
) d(day)
WHERE s."isActive" AND g."deletedAt" IS NULL
  AND (extract(isodow FROM d.day)::int - 1) = s."dayOfWeek"
  AND NOT EXISTS (SELECT 1 FROM "Holiday" h WHERE h.date::date = d.day::date
    AND (h."institutionId" IS NULL OR h."institutionId" = s."institutionId"))
ON CONFLICT ("scheduleId", date) DO NOTHING;

COMMIT;
