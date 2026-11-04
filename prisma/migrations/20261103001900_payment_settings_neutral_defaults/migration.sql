-- Brand-neutral column defaults for new PaymentSettings rows. The payee and
-- account names were defaulted to a specific academy; the application now
-- fills them from config/brand.ts when it creates the row, and falls back to
-- the brand name when a stored value is blank.
-- SET DEFAULT only changes what future inserts get: no existing row, including
-- the production settings row, is touched. Repeating it is a no-op.
ALTER TABLE "PaymentSettings" ALTER COLUMN "upiPayeeName" SET DEFAULT '';
ALTER TABLE "PaymentSettings" ALTER COLUMN "bankAccountName" SET DEFAULT '';
