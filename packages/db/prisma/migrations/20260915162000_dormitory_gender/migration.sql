CREATE TYPE "Gender" AS ENUM ('FEMALE', 'MALE');
ALTER TABLE "Institution" ADD COLUMN gender "Gender";
ALTER TABLE "Student" ADD COLUMN gender "Gender";
CREATE FUNCTION validate_dormitory_gender() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
DECLARE dorm_gender "Gender";
BEGIN
  IF TG_TABLE_NAME='Student' THEN
    SELECT gender INTO dorm_gender FROM "Institution" WHERE id=NEW."institutionId";
    IF dorm_gender IS NOT NULL AND NEW.gender IS DISTINCT FROM dorm_gender THEN
      RAISE EXCEPTION 'Student gender must match dormitory gender' USING ERRCODE='23514';
    END IF;
  ELSE
    IF NEW.gender IS NOT NULL AND EXISTS (SELECT 1 FROM "Student" WHERE "institutionId"=NEW.id AND gender IS DISTINCT FROM NEW.gender AND "deletedAt" IS NULL AND "withdrawDate" IS NULL) THEN
      RAISE EXCEPTION 'Dormitory gender conflicts with resident students' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER student_dormitory_gender BEFORE INSERT OR UPDATE ON "Student" FOR EACH ROW EXECUTE FUNCTION validate_dormitory_gender();
CREATE TRIGGER dormitory_gender BEFORE INSERT OR UPDATE ON "Institution" FOR EACH ROW EXECUTE FUNCTION validate_dormitory_gender();
