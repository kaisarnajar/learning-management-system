-- One open fee submission per (student, course, fee period label), now
-- ignoring soft-deleted rows as well as rejected ones.
--
-- Voiding an approved fee payment soft-deletes its submission (deletedAt is
-- set, status stays 'approved'). The index from
-- 20261103000300_payment_unique_indexes still counted that row, so the
-- student could never pay the voided period again: the application's
-- duplicate check (which skips deleted rows) let the submission through and
-- the database then refused it as a duplicate. The index is rebuilt with the
-- same predicate the application uses. Index-only change; no row is touched.

DROP INDEX IF EXISTS "CoursePaymentSubmission_userId_courseId_label_partial_key";

DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "CoursePaymentSubmission_userId_courseId_label_partial_key"
        ON "CoursePaymentSubmission"("userId", "courseId", "label")
        WHERE "status" <> 'rejected' AND "deletedAt" IS NULL;
EXCEPTION WHEN unique_violation THEN
    RAISE WARNING 'Skipped CoursePaymentSubmission_userId_courseId_label_partial_key: duplicate fee submissions exist. Run scripts/report-duplicate-payment-keys.ts.';
END $$;
