-- Additive: the fee a waiver request is about becomes a real column instead
-- of a "[Fee Type: ...]" prefix inside the free-text reason. Nullable so the
-- column is metadata-only to add; scripts/backfill-waiver-fee-type.ts fills
-- it for existing rows and readers fall back to the prefix until then.
DO $$ BEGIN
    CREATE TYPE "WaiverFeeType" AS ENUM ('ENROLLMENT', 'COURSE', 'BOTH');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "CouponRequest" ADD COLUMN IF NOT EXISTS "feeType" "WaiverFeeType";
