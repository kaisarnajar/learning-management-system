-- Additive: the billing period a fee submission pays for ("MONTHLY:2026-01",
-- "ONE_TIME", "ENROLLMENT"; see services/payment-period.ts).
--
-- The existing duplicate guard is the unique index on (userId, courseId,
-- label), but the label embeds coupon text ("… (30% Fee Waiver)"), so the
-- same month paid with and without a coupon passes it. The key identifies
-- the period itself. Nullable: existing rows are filled by
-- scripts/backfill-period-key.ts. A later migration adds the partial unique
-- index; this one only adds the column and a plain lookup index.
ALTER TABLE "CoursePaymentSubmission" ADD COLUMN IF NOT EXISTS "periodKey" TEXT;

CREATE INDEX IF NOT EXISTS "CoursePaymentSubmission_userId_courseId_periodKey_idx" ON "CoursePaymentSubmission"("userId", "courseId", "periodKey");
