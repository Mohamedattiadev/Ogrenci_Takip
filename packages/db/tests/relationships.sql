-- Integration checks run on the real schema, with every fixture rolled back.
BEGIN;
INSERT INTO "Institution" (id,name,code,"updatedAt") VALUES ('test-dorm-a','Test A','TEST-REL-A',now()),('test-dorm-b','Test B','TEST-REL-B',now());
INSERT INTO "ScholarshipProgram" (id,code,name,"updatedAt") VALUES ('test-program-a','TEST-REL-P-A','Test P A',now()),('test-program-b','TEST-REL-P-B','Test P B',now());
INSERT INTO "User" (id,"institutionId",role,"fullName",email,"passwordHash","updatedAt") VALUES
  ('11111111-1111-4111-a111-111111111111','test-dorm-a','TEACHER','Test teacher','relationships-teacher@example.invalid','no-login',now()),
  ('22222222-2222-4222-a222-222222222222','test-dorm-a','INSTITUTION_ADMIN','Test admin','relationships-admin@example.invalid','no-login',now());
INSERT INTO "AcademicTerm" (id,"institutionId",name,"startDate","endDate") VALUES
  ('test-term-a','test-dorm-a','Test', '2026-01-01','2026-12-31'),('test-term-b','test-dorm-b','Test','2026-01-01','2026-12-31');
INSERT INTO "Group" (id,"institutionId","termId",name,"scholarshipProgramId") VALUES
  ('test-group-a','test-dorm-a','test-term-a','Test A','test-program-a'),
  ('test-group-b','test-dorm-b','test-term-b','Test B','test-program-a'),
  ('test-group-hidden','test-dorm-a','test-term-a','Hidden','test-program-b');
INSERT INTO "Student" (id,"institutionId","studentNumber","firstName","lastName","enrollDate","updatedAt","scholarshipProgramId") VALUES
  ('test-student-a','test-dorm-a','TEST-REL-1','Test','A','2026-01-01',now(),'test-program-a'),
  ('test-student-b','test-dorm-b','TEST-REL-2','Test','B','2026-01-01',now(),'test-program-a'),
  ('test-student-hidden','test-dorm-a','TEST-REL-3','Test','Hidden','2026-01-01',now(),'test-program-b');
INSERT INTO "GroupMembership" (id,"studentId","groupId","effectiveFrom") VALUES
  ('test-member-a','test-student-a','test-group-a','2026-01-01'),('test-member-b','test-student-b','test-group-b','2026-01-01'),
  ('test-member-hidden','test-student-hidden','test-group-hidden','2026-01-01');
INSERT INTO "Course" (id,"institutionId",name) VALUES ('test-course-a','test-dorm-a','Test'),('test-course-b','test-dorm-b','Test');
INSERT INTO "TeacherAssignment" (id,"teacherId","institutionId","scholarshipProgramId","updatedAt") VALUES
  ('test-assignment-a','11111111-1111-4111-a111-111111111111','test-dorm-a','test-program-a',now()),
  ('test-assignment-b','11111111-1111-4111-a111-111111111111','test-dorm-b','test-program-a',now());
INSERT INTO "LessonSchedule" (id,"institutionId","groupId","courseId","teacherId","assignmentId","dayOfWeek","startTime","endTime") VALUES
  ('test-schedule-a','test-dorm-a','test-group-a','test-course-a','11111111-1111-4111-a111-111111111111','test-assignment-a',0,'10:00','11:00'),
  ('test-schedule-b','test-dorm-b','test-group-b','test-course-b','11111111-1111-4111-a111-111111111111','test-assignment-b',1,'10:00','11:00');
INSERT INTO "SessionOccurrence" (id,"scheduleId",date) VALUES ('test-session-b','test-schedule-b','2026-09-15');
UPDATE "Student" SET gender='MALE' WHERE id IN ('test-student-a','test-student-hidden');
UPDATE "Student" SET gender='FEMALE' WHERE id='test-student-b';
UPDATE "Institution" SET gender='MALE' WHERE id='test-dorm-a';
UPDATE "Institution" SET gender='FEMALE' WHERE id='test-dorm-b';

DO $$ BEGIN
  BEGIN
    UPDATE "Student" SET gender='FEMALE' WHERE id='test-student-a';
    RAISE EXCEPTION 'Dormitory gender mismatch was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE "Institution" SET gender='FEMALE' WHERE id='test-dorm-a';
    RAISE EXCEPTION 'Dormitory gender changed despite incompatible residents';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO "GroupMembership" (id,"studentId","groupId","effectiveFrom") VALUES ('test-invalid','test-student-a','test-group-b',now());
    RAISE EXCEPTION 'Cross-dormitory membership was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO "GroupMembership" (id,"studentId","groupId","effectiveFrom") VALUES ('test-invalid','test-student-a','test-group-hidden',now());
    RAISE EXCEPTION 'Wrong scholarship membership was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE "LessonSchedule" SET "assignmentId"='test-assignment-a' WHERE id='test-schedule-b';
    RAISE EXCEPTION 'Wrong teacher assignment was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE "Student" SET "scholarshipProgramId"='test-program-b' WHERE id='test-student-a';
    RAISE EXCEPTION 'Membership consistency was lost';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

SET LOCAL ROLE app_runtime;
SELECT set_config('app.actor_id','11111111-1111-4111-a111-111111111111',true);
SELECT set_config('app.institution_id','test-dorm-a',true);
SELECT set_config('app.is_superadmin','false',true);
DO $$ BEGIN
  IF (SELECT count(*) FROM "Student") <> 2 THEN RAISE EXCEPTION 'Teacher must see exactly two assigned students across dormitories'; END IF;
  IF (SELECT count(*) FROM "LessonSchedule") <> 2 THEN RAISE EXCEPTION 'Teacher cross-dormitory schedule failed'; END IF;
  IF EXISTS (SELECT 1 FROM "Student" WHERE id='test-student-hidden') THEN RAISE EXCEPTION 'Unassigned student leaked'; END IF;
  IF EXISTS (SELECT 1 FROM "User" WHERE id='22222222-2222-4222-a222-222222222222') THEN RAISE EXCEPTION 'Other user leaked'; END IF;
END $$;
INSERT INTO "AttendanceRecord" (id,"sessionOccurrenceId","studentId",status,"markedById","updatedAt") VALUES
  ('test-attendance','test-session-b','test-student-b','PRESENT','11111111-1111-4111-a111-111111111111',now());
DO $$ BEGIN
  BEGIN
    INSERT INTO "AttendanceRecord" (id,"sessionOccurrenceId","studentId",status,"markedById","updatedAt") VALUES
      ('test-invalid','test-session-b','test-student-a','PRESENT','11111111-1111-4111-a111-111111111111',now());
    RAISE EXCEPTION 'Student from another lesson accepted in attendance';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
SELECT set_config('app.actor_id','22222222-2222-4222-a222-222222222222',true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Student" WHERE id='test-student-b') THEN RAISE EXCEPTION 'Administrator crossed dormitory boundary'; END IF;
END $$;
ROLLBACK;
