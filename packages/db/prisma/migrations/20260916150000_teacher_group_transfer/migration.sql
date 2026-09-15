-- GroupMembership satirinin kimligi (hangi ogrenci, hangi grup, ne zaman basladi) sabittir;
-- sadece effectiveTo kapatilabilir. RLS hocaya UPDATE izni acinca bu olmadan hoca mevcut
-- bir satirin groupId/studentId/effectiveFrom degerini degistirebilirdi.
CREATE OR REPLACE FUNCTION guard_membership_identity() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW."studentId" IS DISTINCT FROM OLD."studentId"
     OR NEW."groupId" IS DISTINCT FROM OLD."groupId"
     OR NEW."effectiveFrom" IS DISTINCT FROM OLD."effectiveFrom" THEN
    RAISE EXCEPTION 'Group membership identity is immutable; close it and open a new one'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_membership_identity ON "GroupMembership";
CREATE TRIGGER guard_membership_identity BEFORE UPDATE ON "GroupMembership"
  FOR EACH ROW EXECUTE FUNCTION guard_membership_identity();
