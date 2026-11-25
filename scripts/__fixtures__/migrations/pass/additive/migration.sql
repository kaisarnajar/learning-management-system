-- DROP TABLE "Expense"; (commented out, never runs)
/* TRUNCATE "AuditLog"; */
ALTER TYPE "CourseStatus" ADD VALUE IF NOT EXISTS 'COMING_SOON';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nickname" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Book" ADD CONSTRAINT "Book_x_fkey" FOREIGN KEY ("x") REFERENCES "X"("id") ON DELETE SET NULL ON UPDATE CASCADE;
UPDATE "User" SET "nickname" = "name" WHERE "nickname" = '';
DELETE FROM "Session" WHERE "expires" < NOW();
UPDATE "RegistrationSequence" SET "value" = "value" + 1 WHERE "id" = 1 RETURNING "value";
