-- Keep each legacy text status/type column and its typed twin (migration
-- 20261103001300_status_enum_columns) in agreement. The app filters on the
-- typed twin (plan 7.7), so a row whose twin is NULL or disagrees with its
-- text is listed under the wrong status, or not at all.
--
-- 1. Mapping functions text -> enum, the same mapping as services/status-compat.ts
--    and scripts/backfill-status-enums.ts. Case-insensitive; a value with no
--    mapping (legacy or free text) gives NULL instead of a cast error.
-- 2. Backfill: twins that are still NULL are filled from the text. Idempotent;
--    unmapped text stays NULL, as the backfill script leaves it.
-- 3. A BEFORE INSERT/UPDATE trigger per table fills a NULL twin from its text,
--    and recomputes the twin when only the text changes, so writers that set
--    only the text (seeds, older scripts) cannot create a gap again.
-- 4. CHECK constraints (NOT VALID: existing rows are not scanned; a follow-up
--    migration VALIDATEs them, per 5.27) refuse a twin that disagrees with a
--    text that has a mapping. NULL or unmapped text never fails.
-- 5. Indexes on the typed columns the filters now use, mirroring the
--    existing text-column indexes.

-- 1. Mapping functions -------------------------------------------------------

CREATE OR REPLACE FUNCTION lms_enrollment_status_from_text(value TEXT) RETURNS "EnrollmentStatus"
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE lower(value)
    WHEN 'pending_approval' THEN 'PENDING_APPROVAL'::"EnrollmentStatus"
    WHEN 'awaiting_enrollment_fee' THEN 'AWAITING_ENROLLMENT_FEE'::"EnrollmentStatus"
    WHEN 'active' THEN 'ACTIVE'::"EnrollmentStatus"
    WHEN 'completed' THEN 'COMPLETED'::"EnrollmentStatus"
    WHEN 'rejected' THEN 'REJECTED'::"EnrollmentStatus"
  END
$$;

CREATE OR REPLACE FUNCTION lms_certificate_type_from_text(value TEXT) RETURNS "CertificateType"
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE lower(value)
    WHEN 'appreciation' THEN 'APPRECIATION'::"CertificateType"
    WHEN 'completion' THEN 'COMPLETION'::"CertificateType"
  END
$$;

-- Older releases stored a declined submission as "declined", newer ones as "rejected".
CREATE OR REPLACE FUNCTION lms_submission_status_from_text(value TEXT) RETURNS "PaymentSubmissionStatus"
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE lower(value)
    WHEN 'pending_verification' THEN 'PENDING_VERIFICATION'::"PaymentSubmissionStatus"
    WHEN 'approved' THEN 'APPROVED'::"PaymentSubmissionStatus"
    WHEN 'rejected' THEN 'DECLINED'::"PaymentSubmissionStatus"
    WHEN 'declined' THEN 'DECLINED'::"PaymentSubmissionStatus"
  END
$$;

CREATE OR REPLACE FUNCTION lms_payment_type_from_text(value TEXT) RETURNS "PaymentType"
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE lower(value)
    WHEN 'monthly' THEN 'MONTHLY'::"PaymentType"
    WHEN 'quarterly' THEN 'QUARTERLY'::"PaymentType"
    WHEN 'half_yearly' THEN 'HALF_YEARLY'::"PaymentType"
    WHEN 'yearly' THEN 'YEARLY'::"PaymentType"
    WHEN 'one_time' THEN 'ONE_TIME'::"PaymentType"
    WHEN 'enrollment' THEN 'ENROLLMENT'::"PaymentType"
    WHEN 'manual' THEN 'MANUAL'::"PaymentType"
    WHEN 'book_purchase' THEN 'BOOK_PURCHASE'::"PaymentType"
  END
$$;

CREATE OR REPLACE FUNCTION lms_payment_method_from_text(value TEXT) RETURNS "PaymentMethod"
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE lower(value)
    WHEN 'upi' THEN 'UPI'::"PaymentMethod"
    WHEN 'bank' THEN 'BANK'::"PaymentMethod"
    WHEN 'waiver' THEN 'WAIVER'::"PaymentMethod"
    WHEN 'cash' THEN 'CASH'::"PaymentMethod"
  END
$$;

CREATE OR REPLACE FUNCTION lms_device_platform_from_text(value TEXT) RETURNS "DevicePlatform"
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE lower(btrim(value))
    WHEN 'android' THEN 'ANDROID'::"DevicePlatform"
    WHEN 'ios' THEN 'IOS'::"DevicePlatform"
    WHEN 'web' THEN 'WEB'::"DevicePlatform"
  END
$$;

CREATE OR REPLACE FUNCTION lms_gender_from_text(value TEXT) RETURNS "Gender"
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE lower(value)
    WHEN 'male' THEN 'MALE'::"Gender"
    WHEN 'female' THEN 'FEMALE'::"Gender"
  END
$$;

-- 2. Backfill NULL twins -----------------------------------------------------

-- Fee waivers recorded before paymentMethod existed (scripts/backfill-status-enums.ts does the same).
UPDATE "CoursePaymentSubmission" SET "paymentMethodEnum" = 'WAIVER'
WHERE "paymentMethodEnum" IS NULL AND "upiTransactionId" = 'FEE-WAIVER';

UPDATE "Enrollment" SET "statusEnum" = lms_enrollment_status_from_text("status")
WHERE "statusEnum" IS NULL AND "status" IS NOT NULL AND lms_enrollment_status_from_text("status") IS NOT NULL;

UPDATE "Enrollment" SET "certificateTypeEnum" = lms_certificate_type_from_text("certificateType")
WHERE "certificateTypeEnum" IS NULL AND "certificateType" IS NOT NULL AND lms_certificate_type_from_text("certificateType") IS NOT NULL;

UPDATE "CoursePaymentSubmission" SET "statusEnum" = lms_submission_status_from_text("status")
WHERE "statusEnum" IS NULL AND "status" IS NOT NULL AND lms_submission_status_from_text("status") IS NOT NULL;

UPDATE "CoursePaymentSubmission" SET "paymentTypeEnum" = lms_payment_type_from_text("paymentType")
WHERE "paymentTypeEnum" IS NULL AND "paymentType" IS NOT NULL AND lms_payment_type_from_text("paymentType") IS NOT NULL;

UPDATE "CoursePaymentSubmission" SET "paymentMethodEnum" = lms_payment_method_from_text("paymentMethod")
WHERE "paymentMethodEnum" IS NULL AND "paymentMethod" IS NOT NULL AND lms_payment_method_from_text("paymentMethod") IS NOT NULL;

UPDATE "PaymentRecord" SET "paymentTypeEnum" = lms_payment_type_from_text("paymentType")
WHERE "paymentTypeEnum" IS NULL AND "paymentType" IS NOT NULL AND lms_payment_type_from_text("paymentType") IS NOT NULL;

UPDATE "DeviceToken" SET "platformEnum" = lms_device_platform_from_text("platform")
WHERE "platformEnum" IS NULL AND "platform" IS NOT NULL AND lms_device_platform_from_text("platform") IS NOT NULL;

UPDATE "Coupon" SET "genderEnum" = lms_gender_from_text("gender")
WHERE "genderEnum" IS NULL AND "gender" IS NOT NULL AND lms_gender_from_text("gender") IS NOT NULL;

-- 3. Triggers that fill the twin from the text ------------------------------
-- On UPDATE, a write that changes the text but leaves the twin as it was
-- (a text-only writer) recomputes the twin; a write that sets both keeps
-- what it set, and the CHECK below rejects a contradiction.

CREATE OR REPLACE FUNCTION lms_enrollment_status_twins() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."status" IS DISTINCT FROM OLD."status" AND NEW."statusEnum" IS NOT DISTINCT FROM OLD."statusEnum" THEN
    NEW."statusEnum" := NULL;
  END IF;
  IF NEW."statusEnum" IS NULL THEN
    NEW."statusEnum" := lms_enrollment_status_from_text(NEW."status");
  END IF;
  IF TG_OP = 'UPDATE' AND NEW."certificateType" IS DISTINCT FROM OLD."certificateType" AND NEW."certificateTypeEnum" IS NOT DISTINCT FROM OLD."certificateTypeEnum" THEN
    NEW."certificateTypeEnum" := NULL;
  END IF;
  IF NEW."certificateTypeEnum" IS NULL THEN
    NEW."certificateTypeEnum" := lms_certificate_type_from_text(NEW."certificateType");
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION lms_submission_status_twins() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."status" IS DISTINCT FROM OLD."status" AND NEW."statusEnum" IS NOT DISTINCT FROM OLD."statusEnum" THEN
    NEW."statusEnum" := NULL;
  END IF;
  IF NEW."statusEnum" IS NULL THEN
    NEW."statusEnum" := lms_submission_status_from_text(NEW."status");
  END IF;
  IF TG_OP = 'UPDATE' AND NEW."paymentType" IS DISTINCT FROM OLD."paymentType" AND NEW."paymentTypeEnum" IS NOT DISTINCT FROM OLD."paymentTypeEnum" THEN
    NEW."paymentTypeEnum" := NULL;
  END IF;
  IF NEW."paymentTypeEnum" IS NULL THEN
    NEW."paymentTypeEnum" := lms_payment_type_from_text(NEW."paymentType");
  END IF;
  IF TG_OP = 'UPDATE' AND NEW."paymentMethod" IS DISTINCT FROM OLD."paymentMethod" AND NEW."paymentMethodEnum" IS NOT DISTINCT FROM OLD."paymentMethodEnum" THEN
    NEW."paymentMethodEnum" := NULL;
  END IF;
  IF NEW."paymentMethodEnum" IS NULL THEN
    NEW."paymentMethodEnum" := lms_payment_method_from_text(NEW."paymentMethod");
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION lms_payment_record_status_twins() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."paymentType" IS DISTINCT FROM OLD."paymentType" AND NEW."paymentTypeEnum" IS NOT DISTINCT FROM OLD."paymentTypeEnum" THEN
    NEW."paymentTypeEnum" := NULL;
  END IF;
  IF NEW."paymentTypeEnum" IS NULL THEN
    NEW."paymentTypeEnum" := lms_payment_type_from_text(NEW."paymentType");
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION lms_device_token_status_twins() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."platform" IS DISTINCT FROM OLD."platform" AND NEW."platformEnum" IS NOT DISTINCT FROM OLD."platformEnum" THEN
    NEW."platformEnum" := NULL;
  END IF;
  IF NEW."platformEnum" IS NULL THEN
    NEW."platformEnum" := lms_device_platform_from_text(NEW."platform");
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION lms_coupon_status_twins() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."gender" IS DISTINCT FROM OLD."gender" AND NEW."genderEnum" IS NOT DISTINCT FROM OLD."genderEnum" THEN
    NEW."genderEnum" := NULL;
  END IF;
  IF NEW."genderEnum" IS NULL THEN
    NEW."genderEnum" := lms_gender_from_text(NEW."gender");
  END IF;
  RETURN NEW;
END
$$;

DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('Enrollment',              'Enrollment_status_twins',              'lms_enrollment_status_twins'),
      ('CoursePaymentSubmission', 'CoursePaymentSubmission_status_twins', 'lms_submission_status_twins'),
      ('PaymentRecord',           'PaymentRecord_status_twins',           'lms_payment_record_status_twins'),
      ('DeviceToken',             'DeviceToken_status_twins',             'lms_device_token_status_twins'),
      ('Coupon',                  'Coupon_status_twins',                  'lms_coupon_status_twins')
    ) AS v(tbl, trg, fn)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = t.trg AND tgrelid = format('%I', t.tbl)::regclass
    ) THEN
      EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION %I()', t.trg, t.tbl, t.fn);
    END IF;
  END LOOP;
END $$;

-- 4. Agreement constraints (NOT VALID) ---------------------------------------
-- A twin may be NULL (the trigger fills it) and anything goes when the text
-- is NULL or has no mapping; otherwise the twin must equal the text's mapping.
-- Legacy fee waivers (UTR 'FEE-WAIVER') are WAIVER whatever their text says,
-- as the backfill script and the backfill above record them.

DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT * FROM (VALUES
      ('Enrollment', 'Enrollment_statusEnum_agrees_check',
        '"statusEnum" IS NULL OR lms_enrollment_status_from_text("status") IS NULL OR "statusEnum" = lms_enrollment_status_from_text("status")'),
      ('Enrollment', 'Enrollment_certificateTypeEnum_agrees_check',
        '"certificateTypeEnum" IS NULL OR lms_certificate_type_from_text("certificateType") IS NULL OR "certificateTypeEnum" = lms_certificate_type_from_text("certificateType")'),
      ('CoursePaymentSubmission', 'CoursePaymentSubmission_statusEnum_agrees_check',
        '"statusEnum" IS NULL OR lms_submission_status_from_text("status") IS NULL OR "statusEnum" = lms_submission_status_from_text("status")'),
      ('CoursePaymentSubmission', 'CoursePaymentSubmission_paymentTypeEnum_agrees_check',
        '"paymentTypeEnum" IS NULL OR lms_payment_type_from_text("paymentType") IS NULL OR "paymentTypeEnum" = lms_payment_type_from_text("paymentType")'),
      ('CoursePaymentSubmission', 'CoursePaymentSubmission_paymentMethodEnum_agrees_check',
        '"paymentMethodEnum" IS NULL OR lms_payment_method_from_text("paymentMethod") IS NULL OR "paymentMethodEnum" = lms_payment_method_from_text("paymentMethod") OR ("paymentMethodEnum" = ''WAIVER'' AND "upiTransactionId" = ''FEE-WAIVER'')'),
      ('PaymentRecord', 'PaymentRecord_paymentTypeEnum_agrees_check',
        '"paymentTypeEnum" IS NULL OR lms_payment_type_from_text("paymentType") IS NULL OR "paymentTypeEnum" = lms_payment_type_from_text("paymentType")'),
      ('DeviceToken', 'DeviceToken_platformEnum_agrees_check',
        '"platformEnum" IS NULL OR lms_device_platform_from_text("platform") IS NULL OR "platformEnum" = lms_device_platform_from_text("platform")'),
      ('Coupon', 'Coupon_genderEnum_agrees_check',
        '"genderEnum" IS NULL OR lms_gender_from_text("gender") IS NULL OR "genderEnum" = lms_gender_from_text("gender")')
    ) AS v(tbl, con, expr)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = c.con) THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (%s) NOT VALID', c.tbl, c.con, c.expr);
    END IF;
  END LOOP;
END $$;

-- 5. Indexes on the typed columns -------------------------------------------

CREATE INDEX IF NOT EXISTS "CoursePaymentSubmission_statusEnum_idx" ON "CoursePaymentSubmission"("statusEnum");
CREATE INDEX IF NOT EXISTS "CoursePaymentSubmission_paymentTypeEnum_idx" ON "CoursePaymentSubmission"("paymentTypeEnum");
CREATE INDEX IF NOT EXISTS "CoursePaymentSubmission_userId_courseId_label_statusEnum_idx" ON "CoursePaymentSubmission"("userId", "courseId", "label", "statusEnum");
CREATE INDEX IF NOT EXISTS "PaymentRecord_paymentTypeEnum_idx" ON "PaymentRecord"("paymentTypeEnum");
