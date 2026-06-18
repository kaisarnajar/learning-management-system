-- CreateEnum
CREATE TYPE "Occupation" AS ENUM ('STUDENT', 'WORKING', 'GOVERNMENT_EMPLOYEE', 'SELF_EMPLOYED', 'LABOURER', 'POLICE_OFFICER', 'ARMED_FORCES', 'TEACHER', 'HEALTHCARE_WORKER', 'ENGINEER', 'IT_PROFESSIONAL', 'ACCOUNTANT', 'LAWYER', 'DRIVER', 'FARMER', 'SHOPKEEPER', 'CLERGY', 'HOMEMAKER', 'RETIRED', 'UNEMPLOYED');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "AnnouncementCategory" AS ENUM ('EXAMS_TESTS', 'ASSIGNMENTS_HOMEWORK', 'STUDY_MATERIALS', 'CLASS_SCHEDULE', 'COURSE_ANNOUNCEMENT', 'GENERAL_NOTICE');

-- CreateEnum
CREATE TYPE "DailyInspirationKind" AS ENUM ('QURAN', 'HADITH');

-- CreateEnum
CREATE TYPE "BlogApprovalStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StudentReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StudentNotificationType" AS ENUM ('PAYMENT_APPROVED', 'ENROLLMENT_APPROVED', 'ENROLLMENT_REJECTED', 'COURSE_ANNOUNCEMENT', 'PERSONAL_MESSAGE', 'SITE_ANNOUNCEMENT', 'BOOK_ORDER_APPROVED', 'BOOK_ORDER_DECLINED', 'BOOK_ORDER_SHIPPED', 'BOOK_ORDER_REFUNDED');

-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('AVAILABLE', 'OUT_OF_STOCK', 'COMING_SOON');

-- CreateEnum
CREATE TYPE "BookOrderStatus" AS ENUM ('PENDING_VERIFICATION', 'APPROVED', 'DECLINED', 'SHIPPED', 'REFUNDED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "fatherName" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "occupation" "Occupation",
    "address" TEXT,
    "whatsapp" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priceInrPaise" INTEGER NOT NULL,
    "monthlyFeeInrPaise" INTEGER NOT NULL,
    "teacherId" TEXT,
    "status" "CourseStatus" NOT NULL DEFAULT 'PUBLISHED',
    "featuredOnHomepage" BOOLEAN NOT NULL DEFAULT false,
    "featuredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "specialization" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "imageUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseAnnouncement" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "teacherId" TEXT,
    "authorName" TEXT NOT NULL,
    "postedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "category" "AnnouncementCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentPath" TEXT,
    "attachmentName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteAnnouncement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "eventDate" TEXT,
    "location" TEXT,
    "showOnHomepage" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "approvalStatus" "BlogApprovalStatus" NOT NULL DEFAULT 'APPROVED',
    "featuredOnHomepage" BOOLEAN NOT NULL DEFAULT false,
    "featuredAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogImage" (
    "id" TEXT NOT NULL,
    "blogPostId" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyInspiration" (
    "id" TEXT NOT NULL,
    "kind" "DailyInspirationKind" NOT NULL,
    "arabicText" TEXT NOT NULL,
    "englishTranslation" TEXT NOT NULL,
    "reference" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyInspiration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "course" TEXT,
    "location" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "status" "StudentReviewStatus" NOT NULL DEFAULT 'PENDING',
    "featuredOnHomepage" BOOLEAN NOT NULL DEFAULT false,
    "featuredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "imagePath" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "featuredOnHomepage" BOOLEAN NOT NULL DEFAULT false,
    "featuredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_approval',
    "completedAt" TIMESTAMP(3),
    "uploadedCertificatePath" TEXT,
    "certificateEmailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FatwaQuestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "askerName" TEXT NOT NULL,
    "askerEmail" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answeredAt" TIMESTAMP(3),
    "answeredById" TEXT,
    "featuredOnHomepage" BOOLEAN NOT NULL DEFAULT false,
    "featuredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FatwaQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactInquiry" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "reply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "repliedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "amountInrPaise" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "paymentType" TEXT,
    "description" TEXT,
    "receiptEmailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amountInrPaise" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "teacherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialLinksSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "contactEmail" TEXT NOT NULL DEFAULT 'info@darsequranacademy.org',
    "whatsappNumber" TEXT NOT NULL DEFAULT '917006025120',
    "whatsappDefaultMessage" TEXT NOT NULL DEFAULT 'Assalamu Alaikum, I would like to know more about Darse Quran Academy.',
    "facebookUrl" TEXT NOT NULL DEFAULT 'https://facebook.com',
    "instagramUrl" TEXT NOT NULL DEFAULT 'https://instagram.com',
    "youtubeUrl" TEXT NOT NULL DEFAULT 'https://youtube.com',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialLinksSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "upiId" TEXT NOT NULL DEFAULT '',
    "upiPayeeName" TEXT NOT NULL DEFAULT 'Darse Quran Academy',
    "bankAccountName" TEXT NOT NULL DEFAULT 'Darse Quran Academy',
    "bankName" TEXT NOT NULL DEFAULT '',
    "bankAccountNumber" TEXT NOT NULL DEFAULT '',
    "bankIfsc" TEXT NOT NULL DEFAULT '',
    "bankBranch" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoursePaymentSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL DEFAULT 'monthly',
    "label" TEXT NOT NULL,
    "amountInrPaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_verification',
    "paymentMethod" TEXT,
    "upiTransactionId" TEXT,
    "paymentScreenshotPath" TEXT,
    "paymentReference" TEXT,
    "paymentRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoursePaymentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "StudentNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "sourceType" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceInrPaise" INTEGER NOT NULL,
    "purchasePriceInrPaise" INTEGER NOT NULL DEFAULT 0,
    "inventoryPurchased" INTEGER NOT NULL DEFAULT 0,
    "status" "BookStatus" NOT NULL DEFAULT 'AVAILABLE',
    "imagePath" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "featuredOnHomepage" BOOLEAN NOT NULL DEFAULT false,
    "featuredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalAmountInrPaise" INTEGER NOT NULL,
    "status" "BookOrderStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "paymentMethod" TEXT,
    "upiTransactionId" TEXT,
    "paymentScreenshotPath" TEXT,
    "notes" TEXT,
    "deliveryAddress" TEXT NOT NULL DEFAULT 'No address provided',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priceAtPurchaseInrPaise" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");

-- CreateIndex
CREATE INDEX "Course_featuredOnHomepage_featuredAt_idx" ON "Course"("featuredOnHomepage", "featuredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_email_key" ON "Teacher"("email");

-- CreateIndex
CREATE INDEX "CourseAnnouncement_courseId_idx" ON "CourseAnnouncement"("courseId");

-- CreateIndex
CREATE INDEX "CourseAnnouncement_courseId_createdAt_idx" ON "CourseAnnouncement"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "CourseAnnouncement_enrollmentId_idx" ON "CourseAnnouncement"("enrollmentId");

-- CreateIndex
CREATE INDEX "CourseAnnouncement_courseId_enrollmentId_idx" ON "CourseAnnouncement"("courseId", "enrollmentId");

-- CreateIndex
CREATE INDEX "SiteAnnouncement_published_showOnHomepage_idx" ON "SiteAnnouncement"("published", "showOnHomepage");

-- CreateIndex
CREATE INDEX "SiteAnnouncement_published_createdAt_idx" ON "SiteAnnouncement"("published", "createdAt");

-- CreateIndex
CREATE INDEX "BlogPost_published_approvalStatus_createdAt_idx" ON "BlogPost"("published", "approvalStatus", "createdAt");

-- CreateIndex
CREATE INDEX "BlogPost_approvalStatus_createdAt_idx" ON "BlogPost"("approvalStatus", "createdAt");

-- CreateIndex
CREATE INDEX "BlogPost_featuredOnHomepage_featuredAt_idx" ON "BlogPost"("featuredOnHomepage", "featuredAt");

-- CreateIndex
CREATE INDEX "BlogImage_blogPostId_sortOrder_idx" ON "BlogImage"("blogPostId", "sortOrder");

-- CreateIndex
CREATE INDEX "DailyInspiration_published_updatedAt_idx" ON "DailyInspiration"("published", "updatedAt");

-- CreateIndex
CREATE INDEX "StudentReview_status_createdAt_idx" ON "StudentReview"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StudentReview_featuredOnHomepage_featuredAt_idx" ON "StudentReview"("featuredOnHomepage", "featuredAt");

-- CreateIndex
CREATE INDEX "StudentReview_userId_status_idx" ON "StudentReview"("userId", "status");

-- CreateIndex
CREATE INDEX "LibraryItem_featuredOnHomepage_featuredAt_idx" ON "LibraryItem"("featuredOnHomepage", "featuredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_userId_courseId_key" ON "Enrollment"("userId", "courseId");

-- CreateIndex
CREATE INDEX "FatwaQuestion_category_idx" ON "FatwaQuestion"("category");

-- CreateIndex
CREATE INDEX "FatwaQuestion_answeredAt_idx" ON "FatwaQuestion"("answeredAt");

-- CreateIndex
CREATE INDEX "FatwaQuestion_featuredOnHomepage_featuredAt_idx" ON "FatwaQuestion"("featuredOnHomepage", "featuredAt");

-- CreateIndex
CREATE INDEX "ContactInquiry_repliedAt_idx" ON "ContactInquiry"("repliedAt");

-- CreateIndex
CREATE INDEX "ContactInquiry_createdAt_idx" ON "ContactInquiry"("createdAt");

-- CreateIndex
CREATE INDEX "PaymentRecord_userId_idx" ON "PaymentRecord"("userId");

-- CreateIndex
CREATE INDEX "PaymentRecord_paidAt_idx" ON "PaymentRecord"("paidAt");

-- CreateIndex
CREATE INDEX "PaymentRecord_courseId_idx" ON "PaymentRecord"("courseId");

-- CreateIndex
CREATE INDEX "PaymentRecord_paymentType_idx" ON "PaymentRecord"("paymentType");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Expense_paidAt_idx" ON "Expense"("paidAt");

-- CreateIndex
CREATE INDEX "Expense_teacherId_idx" ON "Expense"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "CoursePaymentSubmission_paymentReference_key" ON "CoursePaymentSubmission"("paymentReference");

-- CreateIndex
CREATE UNIQUE INDEX "CoursePaymentSubmission_paymentRecordId_key" ON "CoursePaymentSubmission"("paymentRecordId");

-- CreateIndex
CREATE INDEX "CoursePaymentSubmission_userId_idx" ON "CoursePaymentSubmission"("userId");

-- CreateIndex
CREATE INDEX "CoursePaymentSubmission_courseId_idx" ON "CoursePaymentSubmission"("courseId");

-- CreateIndex
CREATE INDEX "CoursePaymentSubmission_status_idx" ON "CoursePaymentSubmission"("status");

-- CreateIndex
CREATE INDEX "CoursePaymentSubmission_paymentType_idx" ON "CoursePaymentSubmission"("paymentType");

-- CreateIndex
CREATE INDEX "StudentNotification_userId_readAt_idx" ON "StudentNotification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "StudentNotification_userId_createdAt_idx" ON "StudentNotification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudentNotification_userId_type_sourceId_key" ON "StudentNotification"("userId", "type", "sourceId");

-- CreateIndex
CREATE INDEX "Book_status_idx" ON "Book"("status");

-- CreateIndex
CREATE INDEX "Book_published_status_idx" ON "Book"("published", "status");

-- CreateIndex
CREATE INDEX "BookOrder_userId_idx" ON "BookOrder"("userId");

-- CreateIndex
CREATE INDEX "BookOrder_status_idx" ON "BookOrder"("status");

-- CreateIndex
CREATE INDEX "BookOrder_createdAt_idx" ON "BookOrder"("createdAt");

-- CreateIndex
CREATE INDEX "BookOrderItem_orderId_idx" ON "BookOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "BookOrderItem_bookId_idx" ON "BookOrderItem"("bookId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseAnnouncement" ADD CONSTRAINT "CourseAnnouncement_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseAnnouncement" ADD CONSTRAINT "CourseAnnouncement_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseAnnouncement" ADD CONSTRAINT "CourseAnnouncement_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteAnnouncement" ADD CONSTRAINT "SiteAnnouncement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogImage" ADD CONSTRAINT "BlogImage_blogPostId_fkey" FOREIGN KEY ("blogPostId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyInspiration" ADD CONSTRAINT "DailyInspiration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentReview" ADD CONSTRAINT "StudentReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FatwaQuestion" ADD CONSTRAINT "FatwaQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FatwaQuestion" ADD CONSTRAINT "FatwaQuestion_answeredById_fkey" FOREIGN KEY ("answeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactInquiry" ADD CONSTRAINT "ContactInquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactInquiry" ADD CONSTRAINT "ContactInquiry_repliedById_fkey" FOREIGN KEY ("repliedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePaymentSubmission" ADD CONSTRAINT "CoursePaymentSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePaymentSubmission" ADD CONSTRAINT "CoursePaymentSubmission_paymentRecordId_fkey" FOREIGN KEY ("paymentRecordId") REFERENCES "PaymentRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentNotification" ADD CONSTRAINT "StudentNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookOrder" ADD CONSTRAINT "BookOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookOrderItem" ADD CONSTRAINT "BookOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "BookOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookOrderItem" ADD CONSTRAINT "BookOrderItem_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
