-- Additive: where the rendered PDF of an issued receipt / certificate is
-- stored, so downloads and emails reuse one file instead of launching
-- Chromium on every request. Null means "render on demand".
ALTER TABLE "PaymentRecord" ADD COLUMN IF NOT EXISTS "receiptPdfKey" TEXT;
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "certificatePdfKey" TEXT;
