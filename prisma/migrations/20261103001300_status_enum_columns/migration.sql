-- Expand step of the text -> enum migration for status/type columns.
-- Only enum types and NEW nullable columns are added next to the existing
-- text columns, which are neither altered nor dropped (metadata-only change,
-- no table rewrite). scripts/backfill-status-enums.ts fills the new columns;
-- code writes both and reads the enum with a fallback to the text until the
-- contract step in a later release.

DO $$ BEGIN
    CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING_APPROVAL', 'AWAITING_ENROLLMENT_FEE', 'ACTIVE', 'COMPLETED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentSubmissionStatus" AS ENUM ('PENDING_VERIFICATION', 'APPROVED', 'DECLINED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentType" AS ENUM ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'ONE_TIME', 'ENROLLMENT', 'MANUAL', 'BOOK_PURCHASE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentMethod" AS ENUM ('UPI', 'BANK', 'WAIVER', 'CASH');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "CertificateType" AS ENUM ('APPRECIATION', 'COMPLETION');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "DevicePlatform" AS ENUM ('ANDROID', 'IOS', 'WEB');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "statusEnum" "EnrollmentStatus";
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "certificateTypeEnum" "CertificateType";
ALTER TABLE "CoursePaymentSubmission" ADD COLUMN IF NOT EXISTS "statusEnum" "PaymentSubmissionStatus";
ALTER TABLE "CoursePaymentSubmission" ADD COLUMN IF NOT EXISTS "paymentTypeEnum" "PaymentType";
ALTER TABLE "CoursePaymentSubmission" ADD COLUMN IF NOT EXISTS "paymentMethodEnum" "PaymentMethod";
ALTER TABLE "PaymentRecord" ADD COLUMN IF NOT EXISTS "paymentTypeEnum" "PaymentType";
ALTER TABLE "DeviceToken" ADD COLUMN IF NOT EXISTS "platformEnum" "DevicePlatform";
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "genderEnum" "Gender";
