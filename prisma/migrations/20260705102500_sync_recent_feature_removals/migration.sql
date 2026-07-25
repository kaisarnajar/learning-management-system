-- CreateEnum safely
DO $$ BEGIN
    CREATE TYPE "FeeFrequency" AS ENUM ('MONTHLY', 'EVERY_3_MONTHS', 'EVERY_6_MONTHS', 'YEARLY', 'ONE_TIME');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable safely
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "weightInGrams" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BookOrder" ADD COLUMN IF NOT EXISTS "shippingChargeInrPaise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "feeFrequency" "FeeFrequency";
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "rollNumber" INTEGER;
ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "upiNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "registrationNumber" TEXT;

-- DropTable safely
DROP TABLE IF EXISTS "AcademySettings";
DROP TABLE IF EXISTS "AnalyticsEvent";
DROP TABLE IF EXISTS "SocialLinksSettings";

-- DropEnum safely
DROP TYPE IF EXISTS "AnalyticsEventType";

-- CreateTable safely
CREATE TABLE IF NOT EXISTS "ShippingChargeSlab" (
    "id" TEXT NOT NULL,
    "minWeightGrams" INTEGER NOT NULL,
    "maxWeightGrams" INTEGER NOT NULL,
    "chargeInrPaise" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingChargeSlab_pkey" PRIMARY KEY ("id")
);

-- CreateTable safely
CREATE TABLE IF NOT EXISTS "CourseAttendance" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable safely
CREATE TABLE IF NOT EXISTS "CourseAttendanceRecord" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "isPresent" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseAttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable safely
CREATE TABLE IF NOT EXISTS "CourseGrade" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "maxMarks" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable safely
CREATE TABLE IF NOT EXISTS "CourseGradeRecord" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "marksObtained" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseGradeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex safely
CREATE INDEX IF NOT EXISTS "ShippingChargeSlab_minWeightGrams_maxWeightGrams_idx" ON "ShippingChargeSlab"("minWeightGrams", "maxWeightGrams");
CREATE INDEX IF NOT EXISTS "CourseAttendance_courseId_idx" ON "CourseAttendance"("courseId");
CREATE INDEX IF NOT EXISTS "CourseAttendance_date_idx" ON "CourseAttendance"("date");
CREATE UNIQUE INDEX IF NOT EXISTS "CourseAttendance_courseId_date_key" ON "CourseAttendance"("courseId", "date");
CREATE INDEX IF NOT EXISTS "CourseAttendanceRecord_enrollmentId_idx" ON "CourseAttendanceRecord"("enrollmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "CourseAttendanceRecord_attendanceId_enrollmentId_key" ON "CourseAttendanceRecord"("attendanceId", "enrollmentId");
CREATE INDEX IF NOT EXISTS "CourseGrade_courseId_idx" ON "CourseGrade"("courseId");
CREATE INDEX IF NOT EXISTS "CourseGrade_date_idx" ON "CourseGrade"("date");
CREATE INDEX IF NOT EXISTS "CourseGradeRecord_enrollmentId_idx" ON "CourseGradeRecord"("enrollmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "CourseGradeRecord_gradeId_enrollmentId_key" ON "CourseGradeRecord"("gradeId", "enrollmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "Enrollment_courseId_rollNumber_key" ON "Enrollment"("courseId", "rollNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "User_registrationNumber_key" ON "User"("registrationNumber");

-- AddForeignKey safely
DO $$ BEGIN
    ALTER TABLE "CourseAttendance" ADD CONSTRAINT "CourseAttendance_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "CourseAttendanceRecord" ADD CONSTRAINT "CourseAttendanceRecord_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "CourseAttendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "CourseAttendanceRecord" ADD CONSTRAINT "CourseAttendanceRecord_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "CourseGrade" ADD CONSTRAINT "CourseGrade_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "CourseGradeRecord" ADD CONSTRAINT "CourseGradeRecord_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "CourseGrade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "CourseGradeRecord" ADD CONSTRAINT "CourseGradeRecord_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
