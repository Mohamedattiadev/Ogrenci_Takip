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
DROP POLICY IF EXISTS holiday_read ON "Holiday";
CREATE POLICY holiday_read ON "Holiday" FOR SELECT USING (app_actor() IS NOT NULL AND (
  "institutionId" IS NULL OR app_assigned_teacher(app_actor(), "institutionId")));

DO $$ DECLARE f text; t text; BEGIN
  FOREACH f IN ARRAY ARRAY['app_auth_lookup(text)','app_admin_institution(text)','app_teaches_group(text)',
    'app_teaches_session(text)','app_assigned_teacher(text,text)'] LOOP
    EXECUTE 'REVOKE ALL ON FUNCTION ' || f || ' FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION ' || f || ' TO app_runtime';
  END LOOP;
  FOREACH t IN ARRAY ARRAY['Institution','User','RefreshToken','AcademicTerm','Group','Student',
    'GroupMembership','Course','LessonSchedule','SessionOccurrence','AttendanceRecord','Holiday',
    'AuditLog','Notification','ScholarshipProgram','TeacherAssignment','_prisma_migrations'] LOOP
    EXECUTE format('REVOKE ALL ON %I FROM anon, authenticated', t);
  END LOOP;
END $$;

-- Supabase grants new public objects to its Data API roles by default; this app never uses that API.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
