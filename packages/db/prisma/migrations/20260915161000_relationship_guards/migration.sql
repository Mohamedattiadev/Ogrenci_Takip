-- Keep relational rules valid even when records are entered outside the API.
ALTER TABLE "Student" ADD CONSTRAINT student_year_range CHECK ("universityYear" BETWEEN 0 AND 10);
ALTER TABLE "GroupMembership" ADD CONSTRAINT membership_dates CHECK ("effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom");
CREATE UNIQUE INDEX membership_one_active ON "GroupMembership" ("studentId", "groupId") WHERE "effectiveTo" IS NULL;

CREATE FUNCTION validate_dormitory_relationships() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE g "Group"; s "Student"; a "TeacherAssignment";
BEGIN
  IF TG_TABLE_NAME = 'Group' THEN
    IF NOT EXISTS (SELECT 1 FROM "AcademicTerm" WHERE id = NEW."termId" AND "institutionId" = NEW."institutionId") THEN
      RAISE EXCEPTION 'Group and academic term must belong to the same dormitory' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'UPDATE' AND (NEW."institutionId", NEW."scholarshipProgramId") IS DISTINCT FROM (OLD."institutionId", OLD."scholarshipProgramId")
      AND (EXISTS (SELECT 1 FROM "GroupMembership" WHERE "groupId" = OLD.id) OR EXISTS (SELECT 1 FROM "LessonSchedule" WHERE "groupId" = OLD.id)) THEN
      RAISE EXCEPTION 'Create a new group to preserve existing group history' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'TeacherAssignment' THEN
    IF NOT EXISTS (SELECT 1 FROM "User" WHERE id = NEW."teacherId" AND role = 'TEACHER' AND "isActive" AND "deletedAt" IS NULL) THEN
      RAISE EXCEPTION 'Assignment requires an active teacher' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'UPDATE' AND (NEW."teacherId", NEW."institutionId", NEW."scholarshipProgramId") IS DISTINCT FROM (OLD."teacherId", OLD."institutionId", OLD."scholarshipProgramId") THEN
      RAISE EXCEPTION 'Assignment identity is immutable; create a new assignment' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'GroupMembership' THEN
    SELECT * INTO STRICT g FROM "Group" WHERE id = NEW."groupId";
    SELECT * INTO STRICT s FROM "Student" WHERE id = NEW."studentId";
    IF g."institutionId" <> s."institutionId" OR (g."scholarshipProgramId" IS NOT NULL AND g."scholarshipProgramId" IS DISTINCT FROM s."scholarshipProgramId") THEN
      RAISE EXCEPTION 'Student and group must match dormitory and scholarship program' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'LessonSchedule' THEN
    SELECT * INTO STRICT g FROM "Group" WHERE id = NEW."groupId";
    IF g."institutionId" <> NEW."institutionId" OR NOT EXISTS (SELECT 1 FROM "Course" WHERE id = NEW."courseId" AND "institutionId" = NEW."institutionId") THEN
      RAISE EXCEPTION 'Schedule, group and course must belong to the same dormitory' USING ERRCODE = '23514';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM "User" WHERE id = NEW."teacherId" AND role = 'TEACHER' AND "isActive" AND "deletedAt" IS NULL) THEN
      RAISE EXCEPTION 'Schedule requires an active teacher' USING ERRCODE = '23514';
    END IF;
    IF NEW."assignmentId" IS NOT NULL THEN
      SELECT * INTO STRICT a FROM "TeacherAssignment" WHERE id = NEW."assignmentId";
      IF a."teacherId" <> NEW."teacherId" OR a."institutionId" <> NEW."institutionId" OR a."scholarshipProgramId" IS DISTINCT FROM g."scholarshipProgramId" OR (NEW."isActive" AND NOT a."isActive") THEN
        RAISE EXCEPTION 'Schedule must match teacher assignment and group program' USING ERRCODE = '23514';
      END IF;
    ELSIF g."scholarshipProgramId" IS NOT NULL OR NOT EXISTS (SELECT 1 FROM "User" WHERE id = NEW."teacherId" AND "institutionId" = NEW."institutionId") THEN
      RAISE EXCEPTION 'This schedule requires a teacher assignment' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'Student' THEN
    IF EXISTS (SELECT 1 FROM "GroupMembership" m JOIN "Group" gr ON gr.id = m."groupId"
      WHERE m."studentId" = NEW.id AND m."effectiveTo" IS NULL
      AND (gr."institutionId" <> NEW."institutionId" OR (gr."scholarshipProgramId" IS NOT NULL AND gr."scholarshipProgramId" IS DISTINCT FROM NEW."scholarshipProgramId"))) THEN
      RAISE EXCEPTION 'Close active group memberships before changing dormitory or program' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'AttendanceRecord' THEN
    IF NOT EXISTS (SELECT 1 FROM "SessionOccurrence" o JOIN "LessonSchedule" l ON l.id = o."scheduleId"
      JOIN "GroupMembership" m ON m."groupId" = l."groupId"
      WHERE o.id = NEW."sessionOccurrenceId" AND m."studentId" = NEW."studentId"
      AND m."effectiveFrom" <= o.date AND (m."effectiveTo" IS NULL OR m."effectiveTo" > o.date)) THEN
      RAISE EXCEPTION 'Student was not enrolled in this lesson on its date' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER validate_group BEFORE INSERT OR UPDATE ON "Group" FOR EACH ROW EXECUTE FUNCTION validate_dormitory_relationships();
CREATE TRIGGER validate_assignment BEFORE INSERT OR UPDATE ON "TeacherAssignment" FOR EACH ROW EXECUTE FUNCTION validate_dormitory_relationships();
CREATE TRIGGER validate_membership BEFORE INSERT OR UPDATE ON "GroupMembership" FOR EACH ROW EXECUTE FUNCTION validate_dormitory_relationships();
CREATE TRIGGER validate_schedule BEFORE INSERT OR UPDATE ON "LessonSchedule" FOR EACH ROW EXECUTE FUNCTION validate_dormitory_relationships();
CREATE TRIGGER validate_student BEFORE UPDATE ON "Student" FOR EACH ROW EXECUTE FUNCTION validate_dormitory_relationships();
CREATE TRIGGER validate_attendance BEFORE INSERT OR UPDATE ON "AttendanceRecord" FOR EACH ROW EXECUTE FUNCTION validate_dormitory_relationships();
