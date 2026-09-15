-- Student login accounts, homework assignments and submissions.

-- Accounts: staff sign in with e-mail, students with a username (default: student number).
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "User"
  ADD COLUMN "username" TEXT,
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "studentId" TEXT;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_studentId_key" ON "User"("studentId");
ALTER TABLE "User" ADD CONSTRAINT "User_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT user_student_link CHECK ((role = 'STUDENT') = ("studentId" IS NOT NULL));
ALTER TABLE "User" ADD CONSTRAINT user_login_identity CHECK (email IS NOT NULL OR username IS NOT NULL);
ALTER TABLE "User" ADD CONSTRAINT user_username_format CHECK (username IS NULL OR username ~ '^[a-z0-9._-]{3,40}$');

-- Homework
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "allowText" BOOLEAN NOT NULL DEFAULT true,
    "allowFile" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT assignment_answer_type CHECK ("allowText" OR "allowFile"),
    CONSTRAINT assignment_title_length CHECK (length(title) BETWEEN 2 AND 200)
);

CREATE TABLE "AssignmentSubmission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "text" TEXT,
    "fileName" TEXT,
    "fileMime" TEXT,
    "fileSize" INTEGER,
    "fileData" BYTEA,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssignmentSubmission_pkey" PRIMARY KEY ("id"),
    CONSTRAINT submission_not_empty CHECK ("text" IS NOT NULL OR "fileData" IS NOT NULL),
    CONSTRAINT submission_text_length CHECK ("text" IS NULL OR length("text") <= 20000),
    CONSTRAINT submission_file CHECK ("fileData" IS NULL OR (
      "fileMime" = 'application/pdf' AND "fileName" IS NOT NULL
      AND "fileSize" = octet_length("fileData") AND "fileSize" <= 10485760))
);

CREATE INDEX "Assignment_scheduleId_idx" ON "Assignment"("scheduleId");
CREATE INDEX "Assignment_institutionId_idx" ON "Assignment"("institutionId");
CREATE UNIQUE INDEX "AssignmentSubmission_assignmentId_studentId_key" ON "AssignmentSubmission"("assignmentId", "studentId");
CREATE INDEX "AssignmentSubmission_studentId_idx" ON "AssignmentSubmission"("studentId");

ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "LessonSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Session helpers (also defined in dormitory-policies.sql; triggers below need them at migration time).
CREATE OR REPLACE FUNCTION app_actor() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.actor_id', true), '')
$$;
-- The signed-in student's record, only while both account and record are active.
CREATE OR REPLACE FUNCTION app_student_id() RETURNS text LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public AS $$
  SELECT u."studentId" FROM "User" u JOIN "Student" s ON s.id = u."studentId"
  WHERE u.id = app_actor() AND u.role = 'STUDENT' AND u."isActive" AND u."deletedAt" IS NULL
    AND s."deletedAt" IS NULL AND s."withdrawDate" IS NULL
$$;

-- A deleted or withdrawn student can no longer sign in; open sessions are revoked.
CREATE FUNCTION sync_student_account() RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW."deletedAt" IS NOT NULL AND OLD."deletedAt" IS NULL)
     OR (NEW."withdrawDate" IS NOT NULL AND OLD."withdrawDate" IS NULL) THEN
    UPDATE "User" SET "isActive" = false, "updatedAt" = now() WHERE "studentId" = NEW.id;
    UPDATE "RefreshToken" SET "revokedAt" = now()
      WHERE "revokedAt" IS NULL AND "userId" IN (SELECT id FROM "User" WHERE "studentId" = NEW.id);
  END IF;
  IF NEW."institutionId" IS DISTINCT FROM OLD."institutionId" THEN
    UPDATE "User" SET "institutionId" = NEW."institutionId", "updatedAt" = now() WHERE "studentId" = NEW.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER student_account_sync AFTER UPDATE ON "Student" FOR EACH ROW EXECUTE FUNCTION sync_student_account();

-- Students edit only their own contact/education details; admin-managed fields stay locked.
CREATE FUNCTION guard_student_self_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF app_student_id() IS NOT NULL AND (
     NEW.id <> app_student_id()
     OR (NEW."studentNumber", NEW."institutionId", NEW."scholarshipProgramId", NEW.gender,
         NEW."enrollDate", NEW."withdrawDate", NEW."deletedAt")
        IS DISTINCT FROM
        (OLD."studentNumber", OLD."institutionId", OLD."scholarshipProgramId", OLD.gender,
         OLD."enrollDate", OLD."withdrawDate", OLD."deletedAt")) THEN
    RAISE EXCEPTION 'Students can only update their personal, contact and education details' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER student_self_update_guard BEFORE UPDATE ON "Student" FOR EACH ROW EXECUTE FUNCTION guard_student_self_update();

-- Assignment dormitory always follows its lesson.
CREATE FUNCTION set_assignment_institution() RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT "institutionId" INTO NEW."institutionId" FROM "LessonSchedule" WHERE id = NEW."scheduleId";
  IF NEW."institutionId" IS NULL THEN
    RAISE EXCEPTION 'Lesson schedule not found' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER assignment_institution BEFORE INSERT OR UPDATE ON "Assignment" FOR EACH ROW EXECUTE FUNCTION set_assignment_institution();

-- Only enrolled students answer, and only in the formats the teacher allowed.
CREATE FUNCTION validate_submission() RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
DECLARE a record;
BEGIN
  SELECT x."allowText", x."allowFile", x."deletedAt", l."groupId" INTO a
    FROM "Assignment" x JOIN "LessonSchedule" l ON l.id = x."scheduleId" WHERE x.id = NEW."assignmentId";
  IF NOT FOUND OR a."deletedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'Assignment not found' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "GroupMembership" m
      WHERE m."groupId" = a."groupId" AND m."studentId" = NEW."studentId" AND m."effectiveTo" IS NULL) THEN
    RAISE EXCEPTION 'Student is not enrolled in this lesson' USING ERRCODE = '23514';
  END IF;
  IF NEW."text" IS NOT NULL AND NOT a."allowText" THEN
    RAISE EXCEPTION 'This assignment does not accept text answers' USING ERRCODE = '23514';
  END IF;
  IF NEW."fileData" IS NOT NULL AND NOT a."allowFile" THEN
    RAISE EXCEPTION 'This assignment does not accept files' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER submission_validation BEFORE INSERT OR UPDATE ON "AssignmentSubmission" FOR EACH ROW EXECUTE FUNCTION validate_submission();
