-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('PAGE_VIEW', 'BUTTON_CLICK', 'CUSTOM');

-- AlterTable
ALTER TABLE "BookOrder" ADD COLUMN     "deliveryPhoneNumber" TEXT,
ADD COLUMN     "deliveryPinCode" TEXT;

-- AlterTable
ALTER TABLE "Enrollment" DROP COLUMN "uploadedCertificatePath",
ADD COLUMN     "certificateGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "certificateGrade" INTEGER,
ADD COLUMN     "certificateNumber" TEXT,
ADD COLUMN     "certificateType" TEXT;

-- AlterTable
ALTER TABLE "PaymentRecord" ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "receiptFeeAmountPaise" INTEGER,
ADD COLUMN     "receiptGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "receiptGstAmountPaise" INTEGER,
ADD COLUMN     "receiptIncludesGst" BOOLEAN;

-- CreateTable
CREATE TABLE "AcademySettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "academyName" TEXT NOT NULL DEFAULT 'Darse Quran Academy',
    "academyAddress" TEXT NOT NULL DEFAULT 'Treran Tangmarg, Baramulla J&K 193402',
    "academyWebsite" TEXT NOT NULL DEFAULT 'www.darsequranacademy.com',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "type" "AnalyticsEventType" NOT NULL,
    "page" TEXT NOT NULL,
    "eventName" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_type_idx" ON "AnalyticsEvent"("type");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_page_idx" ON "AnalyticsEvent"("page");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Course_teacherId_idx" ON "Course"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_certificateNumber_key" ON "Enrollment"("certificateNumber");

-- CreateIndex
CREATE INDEX "Enrollment_courseId_idx" ON "Enrollment"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRecord_invoiceNumber_key" ON "PaymentRecord"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
