-- Additive: fully waived fees queue for admin confirmation unless the academy opts in.
ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "autoApproveFullWaivers" BOOLEAN NOT NULL DEFAULT false;
