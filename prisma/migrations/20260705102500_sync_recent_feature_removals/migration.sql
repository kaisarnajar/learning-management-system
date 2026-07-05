-- CreateEnum
CREATE TYPE "FeeFrequency" AS ENUM ('MONTHLY', 'EVERY_3_MONTHS', 'EVERY_6_MONTHS', 'YEARLY', 'ONE_TIME');

-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "weightInGrams" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "BookOrder" ADD COLUMN     "shippingChargeInrPaise" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "feeFrequency" "FeeFrequency";

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "rollNumber" INTEGER;

-- AlterTable
ALTER TABLE "PaymentSettings" ADD COLUMN     "upiNumber" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "registrationNumber" TEXT;

-- DropTable
DROP TABLE "AcademySettings";

-- DropTable
DROP TABLE "AnalyticsEvent";

-- DropTable
DROP TABLE "SocialLinksSettings";

-- DropEnum
DROP TYPE "AnalyticsEventType";

-- CreateTable
CREATE TABLE "ShippingChargeSlab" (
    "id" TEXT NOT NULL,
    "minWeightGrams" INTEGER NOT NULL,
    "maxWeightGrams" INTEGER NOT NULL,
    "chargeInrPaise" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingChargeSlab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseAttendance" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseAttendanceRecord" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "isPresent" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseAttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseGrade" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "maxMarks" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseGradeRecord" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "marksObtained" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseGradeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShippingChargeSlab_minWeightGrams_maxWeightGrams_idx" ON "ShippingChargeSlab"("minWeightGrams", "maxWeightGrams");

-- CreateIndex
CREATE INDEX "CourseAttendance_courseId_idx" ON "CourseAttendance"("courseId");

-- CreateIndex
CREATE INDEX "CourseAttendance_date_idx" ON "CourseAttendance"("date");

-- CreateIndex
CREATE UNIQUE INDEX "CourseAttendance_courseId_date_key" ON "CourseAttendance"("courseId", "date");

-- CreateIndex
CREATE INDEX "CourseAttendanceRecord_enrollmentId_idx" ON "CourseAttendanceRecord"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseAttendanceRecord_attendanceId_enrollmentId_key" ON "CourseAttendanceRecord"("attendanceId", "enrollmentId");

-- CreateIndex
CREATE INDEX "CourseGrade_courseId_idx" ON "CourseGrade"("courseId");

-- CreateIndex
CREATE INDEX "CourseGrade_date_idx" ON "CourseGrade"("date");

-- CreateIndex
CREATE INDEX "CourseGradeRecord_enrollmentId_idx" ON "CourseGradeRecord"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseGradeRecord_gradeId_enrollmentId_key" ON "CourseGradeRecord"("gradeId", "enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_courseId_rollNumber_key" ON "Enrollment"("courseId", "rollNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_registrationNumber_key" ON "User"("registrationNumber");

-- AddForeignKey
ALTER TABLE "CourseAttendance" ADD CONSTRAINT "CourseAttendance_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseAttendanceRecord" ADD CONSTRAINT "CourseAttendanceRecord_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "CourseAttendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseAttendanceRecord" ADD CONSTRAINT "CourseAttendanceRecord_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseGrade" ADD CONSTRAINT "CourseGrade_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseGradeRecord" ADD CONSTRAINT "CourseGradeRecord_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "CourseGrade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseGradeRecord" ADD CONSTRAINT "CourseGradeRecord_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
