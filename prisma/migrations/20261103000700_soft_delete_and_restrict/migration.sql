-- Expand step for soft-delete / void semantics. Additive, idempotent.
--
-- 1. Nullable marker columns (no existing row changes).
ALTER TABLE "PaymentRecord" ADD COLUMN IF NOT EXISTS "voidedAt" TIMESTAMP(3);
ALTER TABLE "PaymentRecord" ADD COLUMN IF NOT EXISTS "voidReason" TEXT;
ALTER TABLE "PaymentRecord" ADD COLUMN IF NOT EXISTS "voidedById" TEXT;
ALTER TABLE "CoursePaymentSubmission" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "BookOrder" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "PaymentRecord_voidedAt_idx" ON "PaymentRecord"("voidedAt");
CREATE INDEX IF NOT EXISTS "User_deletedAt_idx" ON "User"("deletedAt");

-- 2. Financial / academic history must not vanish when a parent row is deleted:
--    swap ON DELETE CASCADE for ON DELETE RESTRICT. Each constraint is re-added
--    NOT VALID and validated separately (validation is a read-only scan; the
--    existing rows already satisfy the reference).
DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN
    SELECT * FROM (VALUES
      ('PaymentRecord',           'PaymentRecord_userId_fkey',           'userId',   'User',   'id'),
      ('CoursePaymentSubmission', 'CoursePaymentSubmission_userId_fkey', 'userId',   'User',   'id'),
      ('BookOrder',               'BookOrder_userId_fkey',               'userId',   'User',   'id'),
      ('CouponUsage',             'CouponUsage_couponId_fkey',           'couponId', 'Coupon', 'id'),
      ('CouponUsage',             'CouponUsage_userId_fkey',             'userId',   'User',   'id'),
      ('CourseAttendance',        'CourseAttendance_courseId_fkey',      'courseId', 'Course', 'id'),
      ('CourseGrade',             'CourseGrade_courseId_fkey',           'courseId', 'Course', 'id'),
      ('Coupon',                  'Coupon_courseId_fkey',                'courseId', 'Course', 'id'),
      ('Coupon',                  'Coupon_userId_fkey',                  'userId',   'User',   'id')
    ) AS t(tbl, con, col, ref_tbl, ref_col)
  LOOP
    -- Skip when the constraint already restricts (re-run safety).
    IF EXISTS (
      SELECT 1 FROM pg_constraint c
      WHERE c.conname = fk.con AND c.confdeltype = 'r'
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', fk.tbl, fk.con);
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(%I) ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID',
      fk.tbl, fk.con, fk.col, fk.ref_tbl, fk.ref_col
    );
    EXECUTE format('ALTER TABLE %I VALIDATE CONSTRAINT %I', fk.tbl, fk.con);
  END LOOP;
END $$;
