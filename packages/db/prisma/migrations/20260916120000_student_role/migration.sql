-- New enum values cannot be used in the transaction that adds them, so the role is added alone.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'STUDENT';
