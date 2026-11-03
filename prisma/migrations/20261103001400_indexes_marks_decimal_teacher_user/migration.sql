-- Additive: indexes for the hot queries, the decimal twin of grade marks and
-- a real Teacher -> User link.
--
-- Index note: these are plain CREATE INDEX statements rather than
-- CONCURRENTLY. Prisma applies a migration file as one multi-statement
-- command, which Postgres runs in an implicit transaction, and CREATE INDEX
-- CONCURRENTLY refuses to run inside one. The tables involved are small
-- (academy scale), so the write lock lasts a fraction of a second; rehearse
-- on the Neon branch first (docs/OPERATIONS.md section 3) and note the
-- timing in the release ticket.

-- Enrollment: queues and per-student/per-course lookups, on both the legacy
-- text column (filtered today) and the enum twin (filtered after the
-- contract step).
CREATE INDEX IF NOT EXISTS "Enrollment_status_idx" ON "Enrollment"("status");
CREATE INDEX IF NOT EXISTS "Enrollment_userId_status_idx" ON "Enrollment"("userId", "status");
CREATE INDEX IF NOT EXISTS "Enrollment_courseId_status_idx" ON "Enrollment"("courseId", "status");
CREATE INDEX IF NOT EXISTS "Enrollment_statusEnum_idx" ON "Enrollment"("statusEnum");
CREATE INDEX IF NOT EXISTS "Enrollment_userId_statusEnum_idx" ON "Enrollment"("userId", "statusEnum");
CREATE INDEX IF NOT EXISTS "Enrollment_courseId_statusEnum_idx" ON "Enrollment"("courseId", "statusEnum");

CREATE INDEX IF NOT EXISTS "CoursePaymentSubmission_userId_courseId_label_status_idx" ON "CoursePaymentSubmission"("userId", "courseId", "label", "status");
CREATE INDEX IF NOT EXISTS "CourseAnnouncement_teacherId_idx" ON "CourseAnnouncement"("teacherId");
CREATE INDEX IF NOT EXISTS "CourseGrade_courseId_date_idx" ON "CourseGrade"("courseId", "date");
CREATE INDEX IF NOT EXISTS "FatwaQuestion_approvalStatus_idx" ON "FatwaQuestion"("approvalStatus");
CREATE INDEX IF NOT EXISTS "BlogPost_createdById_idx" ON "BlogPost"("createdById");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");
CREATE INDEX IF NOT EXISTS "VerificationToken_expires_idx" ON "VerificationToken"("expires");
CREATE INDEX IF NOT EXISTS "Expense_paidAt_category_idx" ON "Expense"("paidAt", "category");

-- Redundant secondary indexes: the unique indexes on the same single column
-- already serve every lookup. Dropping an index destroys no data.
DROP INDEX IF EXISTS "Coupon_code_idx";
DROP INDEX IF EXISTS "DeviceToken_token_idx";

-- Expand step for grade marks: exact decimal twin of the Float column.
-- scripts/backfill-grade-marks-decimal.ts fills it; code writes both and
-- reads the decimal with a fallback to the float.
ALTER TABLE "CourseGradeRecord" ADD COLUMN IF NOT EXISTS "marksObtainedDecimal" DECIMAL(6,2);

-- Teacher -> User link (teachers were matched to accounts by email only).
-- scripts/backfill-teacher-user-links.ts fills it by email.
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "userId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Teacher_userId_key" ON "Teacher"("userId");
DO $$ BEGIN
    ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN null; END $$;
ALTER TABLE "Teacher" VALIDATE CONSTRAINT "Teacher_userId_fkey";
