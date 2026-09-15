-- Extends base policies with multi-dormitory teacher access and scholarship records.
CREATE OR REPLACE FUNCTION app_actor() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.actor_id', true), '')
$$;
CREATE OR REPLACE FUNCTION app_admin_institution(i text) RETURNS boolean LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public AS $$
  SELECT app_is_superadmin() OR (i=app_current_institution() AND EXISTS (
    SELECT 1 FROM "User" WHERE id=app_actor() AND role='INSTITUTION_ADMIN' AND "institutionId"=i AND "isActive" AND "deletedAt" IS NULL))
$$;
CREATE OR REPLACE FUNCTION app_teaches_group(g text) RETURNS boolean LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM "LessonSchedule" l JOIN "User" u ON u.id=l."teacherId"
    LEFT JOIN "TeacherAssignment" a ON a.id=l."assignmentId"
    WHERE l."groupId"=g AND l."teacherId"=app_actor() AND u.role='TEACHER' AND u."isActive" AND u."deletedAt" IS NULL
    AND (l."assignmentId" IS NULL OR a."isActive"))
$$;
CREATE OR REPLACE FUNCTION app_teaches_session(o text) RETURNS boolean LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM "SessionOccurrence" s JOIN "LessonSchedule" l ON l.id=s."scheduleId"
    JOIN "User" u ON u.id=l."teacherId" LEFT JOIN "TeacherAssignment" a ON a.id=l."assignmentId"
    WHERE s.id=o AND l."teacherId"=app_actor() AND u.role='TEACHER' AND u."isActive" AND u."deletedAt" IS NULL
    AND (l."assignmentId" IS NULL OR a."isActive"))
$$;
CREATE OR REPLACE FUNCTION app_assigned_teacher(t text, i text) RETURNS boolean LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM "TeacherAssignment" WHERE "teacherId"=t AND "institutionId"=i AND "isActive")
$$;

-- Replace broad institution policies: teachers only see their lesson groups.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['User','AcademicTerm','Group','Student','Course','LessonSchedule','Notification','Holiday','AuditLog'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I',t);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I FOR ALL USING (app_admin_institution("institutionId")) WITH CHECK (app_admin_institution("institutionId"))',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['ScholarshipProgram','TeacherAssignment','RefreshToken'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I',t);
  END LOOP;
END $$;
DROP POLICY IF EXISTS tenant_isolation ON "Institution";
CREATE POLICY tenant_isolation ON "Institution" USING (app_admin_institution(id)) WITH CHECK (app_is_superadmin());
DROP POLICY IF EXISTS teacher_read ON "Institution";
CREATE POLICY teacher_read ON "Institution" FOR SELECT USING (app_assigned_teacher(app_actor(), id));
CREATE POLICY tenant_isolation ON "ScholarshipProgram" USING (app_is_superadmin()) WITH CHECK (app_is_superadmin());
DROP POLICY IF EXISTS program_read ON "ScholarshipProgram";
CREATE POLICY program_read ON "ScholarshipProgram" FOR SELECT USING (app_actor() IS NOT NULL);
CREATE POLICY tenant_isolation ON "TeacherAssignment" USING (app_is_superadmin()) WITH CHECK (app_is_superadmin());
DROP POLICY IF EXISTS assignment_read ON "TeacherAssignment";
CREATE POLICY assignment_read ON "TeacherAssignment" FOR SELECT USING ("teacherId"=app_actor() OR app_admin_institution("institutionId"));
CREATE POLICY tenant_isolation ON "RefreshToken" USING ("userId"=app_actor()) WITH CHECK ("userId"=app_actor());
DROP POLICY IF EXISTS user_read ON "User";
CREATE POLICY user_read ON "User" FOR SELECT USING (id=app_actor() OR (
  app_admin_institution(app_current_institution()) AND app_assigned_teacher(id, app_current_institution())));
DROP POLICY IF EXISTS teacher_read ON "Group";
CREATE POLICY teacher_read ON "Group" FOR SELECT USING (app_teaches_group(id));
DROP POLICY IF EXISTS teacher_read ON "Student";
CREATE POLICY teacher_read ON "Student" FOR SELECT USING (EXISTS (
  SELECT 1 FROM "GroupMembership" m WHERE m."studentId"="Student".id AND app_teaches_group(m."groupId")));
DROP POLICY IF EXISTS teacher_read ON "LessonSchedule";
CREATE POLICY teacher_read ON "LessonSchedule" FOR SELECT USING ("teacherId"=app_actor() AND app_teaches_group("groupId"));
DROP POLICY IF EXISTS teacher_read ON "Course";
CREATE POLICY teacher_read ON "Course" FOR SELECT USING (EXISTS (
  SELECT 1 FROM "LessonSchedule" l WHERE l."courseId"="Course".id AND l."teacherId"=app_actor()));
DROP POLICY IF EXISTS teacher_read ON "AcademicTerm";
CREATE POLICY teacher_read ON "AcademicTerm" FOR SELECT USING (EXISTS (
  SELECT 1 FROM "Group" g WHERE g."termId"="AcademicTerm".id AND app_teaches_group(g.id)));

DROP POLICY IF EXISTS tenant_isolation ON "GroupMembership";
CREATE POLICY tenant_isolation ON "GroupMembership"
  USING (EXISTS (SELECT 1 FROM "Group" g WHERE g.id="groupId" AND app_admin_institution(g."institutionId")))
  WITH CHECK (EXISTS (SELECT 1 FROM "Group" g WHERE g.id="groupId" AND app_admin_institution(g."institutionId")));
DROP POLICY IF EXISTS teacher_read ON "GroupMembership";
CREATE POLICY teacher_read ON "GroupMembership" FOR SELECT USING (app_teaches_group("groupId"));
DROP POLICY IF EXISTS tenant_isolation ON "SessionOccurrence";
CREATE POLICY tenant_isolation ON "SessionOccurrence"
  USING (EXISTS (SELECT 1 FROM "LessonSchedule" l WHERE l.id="scheduleId" AND app_admin_institution(l."institutionId")))
  WITH CHECK (EXISTS (SELECT 1 FROM "LessonSchedule" l WHERE l.id="scheduleId" AND app_admin_institution(l."institutionId")));
DROP POLICY IF EXISTS teacher_read ON "SessionOccurrence";
CREATE POLICY teacher_read ON "SessionOccurrence" FOR SELECT USING (app_teaches_session(id));
DROP POLICY IF EXISTS tenant_isolation ON "AttendanceRecord";
CREATE POLICY tenant_isolation ON "AttendanceRecord"
  USING (app_teaches_session("sessionOccurrenceId") OR EXISTS (SELECT 1 FROM "SessionOccurrence" o JOIN "LessonSchedule" l ON l.id=o."scheduleId" WHERE o.id="sessionOccurrenceId" AND app_admin_institution(l."institutionId")))
  WITH CHECK (app_teaches_session("sessionOccurrenceId") OR EXISTS (SELECT 1 FROM "SessionOccurrence" o JOIN "LessonSchedule" l ON l.id=o."scheduleId" WHERE o.id="sessionOccurrenceId" AND app_admin_institution(l."institutionId")));
-- Every user records their own actions (a teacher correcting attendance in any dormitory).
-- AuditLog stays append-only: runtime role has no UPDATE/DELETE grant.
DROP POLICY IF EXISTS audit_own_insert ON "AuditLog";
CREATE POLICY audit_own_insert ON "AuditLog" FOR INSERT WITH CHECK ("actorId"=app_actor());
DROP POLICY IF EXISTS audit_own_read ON "AuditLog";
CREATE POLICY audit_own_read ON "AuditLog" FOR SELECT USING ("actorId"=app_actor());
-- ---------------------------------------------------------------------------------------------
-- Students: own record, own groups/lessons/teachers, own attendance, homework of their lessons.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_student_id() RETURNS text LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public AS $$
  SELECT u."studentId" FROM "User" u JOIN "Student" s ON s.id = u."studentId"
  WHERE u.id = app_actor() AND u.role = 'STUDENT' AND u."isActive" AND u."deletedAt" IS NULL
    AND s."deletedAt" IS NULL AND s."withdrawDate" IS NULL
$$;
CREATE OR REPLACE FUNCTION app_student_in_group(g text) RETURNS boolean LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public AS $$
  SELECT app_student_id() IS NOT NULL AND EXISTS (
    SELECT 1 FROM "GroupMembership" WHERE "groupId" = g AND "studentId" = app_student_id())
$$;
CREATE OR REPLACE FUNCTION app_student_teacher(t text) RETURNS boolean LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public AS $$
  SELECT app_student_id() IS NOT NULL AND EXISTS (
    SELECT 1 FROM "LessonSchedule" l JOIN "GroupMembership" m ON m."groupId" = l."groupId"
    WHERE l."teacherId" = t AND m."studentId" = app_student_id())
$$;
CREATE OR REPLACE FUNCTION app_student_institution() RETURNS text LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public AS $$
  SELECT "institutionId" FROM "Student" WHERE id = app_student_id()
$$;
-- Staff scope for homework: dormitory admin of the lesson's dormitory or the lesson's active teacher.
CREATE OR REPLACE FUNCTION app_manages_schedule(s text) RETURNS boolean LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM "LessonSchedule" l WHERE l.id = s AND (
    app_admin_institution(l."institutionId") OR (l."teacherId" = app_actor() AND app_teaches_group(l."groupId"))))
$$;
CREATE OR REPLACE FUNCTION app_can_see_assignment(a text) RETURNS boolean LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM "Assignment" x JOIN "LessonSchedule" l ON l.id = x."scheduleId"
    WHERE x.id = a AND (app_manages_schedule(l.id) OR (x."deletedAt" IS NULL AND app_student_in_group(l."groupId"))))
$$;

DROP POLICY IF EXISTS student_self_read ON "Student";
CREATE POLICY student_self_read ON "Student" FOR SELECT USING (id = app_student_id());
DROP POLICY IF EXISTS student_self_update ON "Student";
CREATE POLICY student_self_update ON "Student" FOR UPDATE USING (id = app_student_id()) WITH CHECK (id = app_student_id());
DROP POLICY IF EXISTS student_read ON "Institution";
CREATE POLICY student_read ON "Institution" FOR SELECT USING (id = app_student_institution());
DROP POLICY IF EXISTS student_read ON "GroupMembership";
CREATE POLICY student_read ON "GroupMembership" FOR SELECT USING ("studentId" = app_student_id());
DROP POLICY IF EXISTS student_read ON "Group";
CREATE POLICY student_read ON "Group" FOR SELECT USING (app_student_in_group(id));
DROP POLICY IF EXISTS student_read ON "AcademicTerm";
CREATE POLICY student_read ON "AcademicTerm" FOR SELECT USING (EXISTS (
  SELECT 1 FROM "Group" g WHERE g."termId" = "AcademicTerm".id AND app_student_in_group(g.id)));
DROP POLICY IF EXISTS student_read ON "LessonSchedule";
CREATE POLICY student_read ON "LessonSchedule" FOR SELECT USING (app_student_in_group("groupId"));
DROP POLICY IF EXISTS student_read ON "Course";
CREATE POLICY student_read ON "Course" FOR SELECT USING (EXISTS (
  SELECT 1 FROM "LessonSchedule" l WHERE l."courseId" = "Course".id AND app_student_in_group(l."groupId")));
DROP POLICY IF EXISTS student_read ON "SessionOccurrence";
CREATE POLICY student_read ON "SessionOccurrence" FOR SELECT USING (EXISTS (
  SELECT 1 FROM "LessonSchedule" l WHERE l.id = "scheduleId" AND app_student_in_group(l."groupId")));
DROP POLICY IF EXISTS student_read ON "AttendanceRecord";
CREATE POLICY student_read ON "AttendanceRecord" FOR SELECT USING ("studentId" = app_student_id());
DROP POLICY IF EXISTS student_teacher_read ON "User";
CREATE POLICY student_teacher_read ON "User" FOR SELECT USING (app_student_teacher(id));

DROP POLICY IF EXISTS holiday_read ON "Holiday";
CREATE POLICY holiday_read ON "Holiday" FOR SELECT USING (app_actor() IS NOT NULL AND (
  "institutionId" IS NULL OR app_assigned_teacher(app_actor(), "institutionId")
  OR "institutionId" = app_student_institution()));

-- Homework and submissions
ALTER TABLE "Assignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Assignment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AssignmentSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssignmentSubmission" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS assignment_read ON "Assignment";
CREATE POLICY assignment_read ON "Assignment" FOR SELECT USING (app_can_see_assignment(id));
DROP POLICY IF EXISTS assignment_manage ON "Assignment";
CREATE POLICY assignment_manage ON "Assignment" FOR ALL
  USING (app_manages_schedule("scheduleId")) WITH CHECK (app_manages_schedule("scheduleId"));
DROP POLICY IF EXISTS submission_student ON "AssignmentSubmission";
CREATE POLICY submission_student ON "AssignmentSubmission" FOR ALL
  USING ("studentId" = app_student_id())
  WITH CHECK ("studentId" = app_student_id() AND app_can_see_assignment("assignmentId"));
DROP POLICY IF EXISTS submission_staff_read ON "AssignmentSubmission";
CREATE POLICY submission_staff_read ON "AssignmentSubmission" FOR SELECT USING (EXISTS (
  SELECT 1 FROM "Assignment" x WHERE x.id = "assignmentId" AND app_manages_schedule(x."scheduleId")));

-- Users change only their own password; role, dormitory and status stay admin-controlled.
-- Changing it also clears the "must change on first sign-in" flag.
CREATE OR REPLACE FUNCTION app_set_own_password(p_hash text) RETURNS void LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF app_actor() IS NULL OR p_hash IS NULL OR length(p_hash) < 20 THEN
    RAISE EXCEPTION 'Invalid password change request' USING ERRCODE = '22023';
  END IF;
  UPDATE "User" SET "passwordHash" = p_hash, "mustChangePassword" = false, "updatedAt" = now()
    WHERE id = app_actor() AND "isActive" AND "deletedAt" IS NULL;
END $$;

DO $$ DECLARE f text; t text; BEGIN
  FOREACH f IN ARRAY ARRAY['app_auth_lookup(text)','app_admin_institution(text)','app_teaches_group(text)',
    'app_teaches_session(text)','app_assigned_teacher(text,text)','app_set_own_password(text)',
    'app_student_id()','app_student_in_group(text)','app_student_teacher(text)','app_student_institution()',
    'app_manages_schedule(text)','app_can_see_assignment(text)'] LOOP
    EXECUTE 'REVOKE ALL ON FUNCTION ' || f || ' FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION ' || f || ' TO app_runtime';
  END LOOP;
  FOREACH t IN ARRAY ARRAY['Institution','User','RefreshToken','AcademicTerm','Group','Student',
    'GroupMembership','Course','LessonSchedule','SessionOccurrence','AttendanceRecord','Holiday',
    'AuditLog','Notification','ScholarshipProgram','TeacherAssignment','Assignment',
    'AssignmentSubmission','_prisma_migrations'] LOOP
    EXECUTE format('REVOKE ALL ON %I FROM anon, authenticated', t);
  END LOOP;
END $$;

-- Supabase grants new public objects to its Data API roles by default; this app never uses that API.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
