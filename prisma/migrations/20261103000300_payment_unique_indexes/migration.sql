-- Database-level duplicate protection for fee submissions and book orders.
--
-- These are PARTIAL unique indexes (not expressible in schema.prisma, hence
-- the "_partial" suffix that the drift check ignores). Each one is created
-- inside an exception handler: if production already contains duplicates the
-- index is skipped with a WARNING instead of failing the deploy, and the
-- application-level checks remain the guard until the duplicates are resolved
-- (see scripts/report-duplicate-payment-keys.ts).

-- A UPI/bank transaction reference may back only one fee submission.
DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "CoursePaymentSubmission_upiTransactionId_partial_key"
        ON "CoursePaymentSubmission"("upiTransactionId")
        WHERE "upiTransactionId" IS NOT NULL AND "upiTransactionId" <> '' AND "upiTransactionId" <> 'FEE-WAIVER';
EXCEPTION WHEN unique_violation THEN
    RAISE WARNING 'Skipped CoursePaymentSubmission_upiTransactionId_partial_key: duplicate transaction references exist. Run scripts/report-duplicate-payment-keys.ts.';
END $$;

-- A student may have at most one non-declined submission per course and fee period label.
DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "CoursePaymentSubmission_userId_courseId_label_partial_key"
        ON "CoursePaymentSubmission"("userId", "courseId", "label")
        WHERE "status" <> 'rejected';
EXCEPTION WHEN unique_violation THEN
    RAISE WARNING 'Skipped CoursePaymentSubmission_userId_courseId_label_partial_key: duplicate fee submissions exist. Run scripts/report-duplicate-payment-keys.ts.';
END $$;

-- A transaction reference may back only one book order.
DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "BookOrder_upiTransactionId_partial_key"
        ON "BookOrder"("upiTransactionId")
        WHERE "upiTransactionId" IS NOT NULL AND "upiTransactionId" <> '';
EXCEPTION WHEN unique_violation THEN
    RAISE WARNING 'Skipped BookOrder_upiTransactionId_partial_key: duplicate transaction references exist. Run scripts/report-duplicate-payment-keys.ts.';
END $$;
