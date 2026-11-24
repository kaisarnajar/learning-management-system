DROP INDEX IF EXISTS "Payment_label_partial_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_label_partial_key" ON "Payment"("label") WHERE "deletedAt" IS NULL;
