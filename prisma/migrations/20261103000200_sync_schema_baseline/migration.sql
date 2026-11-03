-- Corrective baseline migration.
--
-- Between 2026-07-06 and 2026-09-09 the schema gained the objects below while
-- production was kept in sync with `prisma db push`; no migration was ever
-- generated for them. This migration records them in the migration history.
--
-- Every statement is guarded (IF NOT EXISTS / duplicate_object) so it is a
-- NO-OP on a database that already has these objects (production) and a
-- complete build on an empty database. It never drops or alters existing
-- columns. Generated with: npx tsx scripts/migration-drift-static.ts <full.sql> --emit

ALTER TYPE "CourseStatus" ADD VALUE IF NOT EXISTS 'COMING_SOON';

ALTER TYPE "StudentNotificationType" ADD VALUE IF NOT EXISTS 'BLOG_COMMENT_ADDED';

DO $$ BEGIN
    CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "CouponType" AS ENUM ('DEFAULT', 'SPECIAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "CouponRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gender" "Gender";

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "policiesAcceptedAt" TIMESTAMP(3);

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "policiesAcceptedVersion" TEXT;

CREATE TABLE IF NOT EXISTS "BlogLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "blogPostId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlogLike_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BlogComment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "blogPostId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BlogComment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "includeGstByDefault" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "feeWaiverEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "CoursePaymentSubmission" ADD COLUMN IF NOT EXISTS "couponId" TEXT;

CREATE TABLE IF NOT EXISTS "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "percentage" INTEGER NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "courseId" TEXT,
    "gender" TEXT,
    "userId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "applyToEnrollment" BOOLEAN NOT NULL DEFAULT true,
    "applyToCourse" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CouponRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "CouponRequestStatus" NOT NULL DEFAULT 'PENDING',
    "couponId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CouponRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CouponUsage" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CouponUsage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'android',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserCartItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserCartItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BlogLike_blogPostId_idx" ON "BlogLike"("blogPostId");

CREATE UNIQUE INDEX IF NOT EXISTS "BlogLike_userId_blogPostId_key" ON "BlogLike"("userId", "blogPostId");

CREATE INDEX IF NOT EXISTS "BlogComment_blogPostId_idx" ON "BlogComment"("blogPostId");

CREATE INDEX IF NOT EXISTS "BlogComment_userId_idx" ON "BlogComment"("userId");

CREATE INDEX IF NOT EXISTS "CoursePaymentSubmission_couponId_idx" ON "CoursePaymentSubmission"("couponId");

CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_code_key" ON "Coupon"("code");

CREATE INDEX IF NOT EXISTS "Coupon_courseId_idx" ON "Coupon"("courseId");

CREATE INDEX IF NOT EXISTS "Coupon_userId_idx" ON "Coupon"("userId");

CREATE INDEX IF NOT EXISTS "Coupon_code_idx" ON "Coupon"("code");

CREATE INDEX IF NOT EXISTS "CouponRequest_userId_idx" ON "CouponRequest"("userId");

CREATE INDEX IF NOT EXISTS "CouponRequest_courseId_idx" ON "CouponRequest"("courseId");

CREATE INDEX IF NOT EXISTS "CouponRequest_couponId_idx" ON "CouponRequest"("couponId");

CREATE INDEX IF NOT EXISTS "CouponUsage_userId_idx" ON "CouponUsage"("userId");

CREATE INDEX IF NOT EXISTS "CouponUsage_couponId_idx" ON "CouponUsage"("couponId");

CREATE UNIQUE INDEX IF NOT EXISTS "CouponUsage_couponId_userId_key" ON "CouponUsage"("couponId", "userId");

CREATE UNIQUE INDEX IF NOT EXISTS "DeviceToken_token_key" ON "DeviceToken"("token");

CREATE INDEX IF NOT EXISTS "DeviceToken_userId_idx" ON "DeviceToken"("userId");

CREATE INDEX IF NOT EXISTS "DeviceToken_token_idx" ON "DeviceToken"("token");

CREATE INDEX IF NOT EXISTS "UserCartItem_userId_idx" ON "UserCartItem"("userId");

CREATE INDEX IF NOT EXISTS "UserCartItem_bookId_idx" ON "UserCartItem"("bookId");

CREATE UNIQUE INDEX IF NOT EXISTS "UserCartItem_userId_bookId_key" ON "UserCartItem"("userId", "bookId");

DO $$ BEGIN
    ALTER TABLE "BlogLike" ADD CONSTRAINT "BlogLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "BlogLike" ADD CONSTRAINT "BlogLike_blogPostId_fkey" FOREIGN KEY ("blogPostId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_blogPostId_fkey" FOREIGN KEY ("blogPostId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "CoursePaymentSubmission" ADD CONSTRAINT "CoursePaymentSubmission_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "CouponRequest" ADD CONSTRAINT "CouponRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "CouponRequest" ADD CONSTRAINT "CouponRequest_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "CouponRequest" ADD CONSTRAINT "CouponRequest_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "UserCartItem" ADD CONSTRAINT "UserCartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "UserCartItem" ADD CONSTRAINT "UserCartItem_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
