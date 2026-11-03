-- Additive: real link from a payment record to the book order it paid for,
-- plus the shipping component stored at receipt-generation time.
ALTER TABLE "PaymentRecord" ADD COLUMN IF NOT EXISTS "bookOrderId" TEXT;
ALTER TABLE "PaymentRecord" ADD COLUMN IF NOT EXISTS "receiptShippingAmountPaise" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentRecord_bookOrderId_key" ON "PaymentRecord"("bookOrderId");

-- FK added NOT VALID (no table scan while the lock is held), then validated.
DO $$ BEGIN
    ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_bookOrderId_fkey"
        FOREIGN KEY ("bookOrderId") REFERENCES "BookOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN null; END $$;
ALTER TABLE "PaymentRecord" VALIDATE CONSTRAINT "PaymentRecord_bookOrderId_fkey";
