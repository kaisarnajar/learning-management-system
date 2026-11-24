-- Additive: the price in force when a fee was submitted or a book was sold.
--
-- Finance reports, the waiver report and the receipt discount line read the
-- course's current fee and the book's current purchase price, so editing a
-- price rewrites history. The application writes these snapshots from now
-- on; reports prefer them and fall back to the current value for older rows
-- (left NULL, there is no reliable source to backfill them from).
--
-- "baseFeePaise": the full fee before any coupon, in paise.
-- "unitCostPaise": the academy's purchase cost of one copy, in paise.
ALTER TABLE "CoursePaymentSubmission" ADD COLUMN IF NOT EXISTS "baseFeePaise" INTEGER;

ALTER TABLE "BookOrderItem" ADD COLUMN IF NOT EXISTS "unitCostPaise" INTEGER;
