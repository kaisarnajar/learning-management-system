-- One live fee submission per (student, course, billing period).
--
-- The application has deduplicated by "periodKey" since it was introduced
-- (20261124000100_payment_period_key); this index makes the database refuse
-- a concurrent duplicate too, which the label index cannot do because the
-- label carries coupon text. Same predicate as the label index: soft-deleted
-- (voided) and declined rows, under both status spellings, do not count.
--
-- Rows without a key (written before the column existed and not yet filled
-- by scripts/backfill-period-key.ts) are outside the index, so it can be
-- created before the backfill runs. Migration-only: schema.prisma cannot
-- express a partial index, hence the "_partial" name the drift check skips.

DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "CoursePaymentSubmission_userId_courseId_periodKey_partial_key"
        ON "CoursePaymentSubmission"("userId", "courseId", "periodKey")
        WHERE "periodKey" IS NOT NULL AND "deletedAt" IS NULL AND "status" NOT IN ('rejected', 'declined');
EXCEPTION WHEN unique_violation THEN
    RAISE WARNING 'Skipped CoursePaymentSubmission_userId_courseId_periodKey_partial_key: a billing period has two live submissions. Run scripts/backfill-period-key.ts for the list.';
END $$;
