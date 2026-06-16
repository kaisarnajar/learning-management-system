-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "fatherName" TEXT,
    "dateOfBirth" DATETIME,
    "occupation" TEXT,
    "address" TEXT,
    "whatsapp" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
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

    PRIMARY KEY ("provider", "providerAccountId"),
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,

    PRIMARY KEY ("identifier", "token")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priceInrPaise" INTEGER NOT NULL,
    "monthlyFeeInrPaise" INTEGER NOT NULL,
    "teacherId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "featuredOnHomepage" BOOLEAN NOT NULL DEFAULT false,
    "featuredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Course_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "specialization" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "imageUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CourseAnnouncement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "teacherId" TEXT,
    "authorName" TEXT NOT NULL,
    "postedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentPath" TEXT,
    "attachmentName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CourseAnnouncement_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourseAnnouncement_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourseAnnouncement_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SiteAnnouncement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "eventDate" TEXT,
    "location" TEXT,
    "showOnHomepage" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SiteAnnouncement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "featuredOnHomepage" BOOLEAN NOT NULL DEFAULT false,
    "featuredAt" DATETIME,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BlogPost_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlogImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blogPostId" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlogImage_blogPostId_fkey" FOREIGN KEY ("blogPostId") REFERENCES "BlogPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyInspiration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "arabicText" TEXT NOT NULL,
    "englishTranslation" TEXT NOT NULL,
    "reference" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyInspiration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "course" TEXT,
    "location" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "featuredOnHomepage" BOOLEAN NOT NULL DEFAULT false,
    "featuredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LibraryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "featuredOnHomepage" BOOLEAN NOT NULL DEFAULT false,
    "featuredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_approval',
    "completedAt" DATETIME,
    "uploadedCertificatePath" TEXT,
    "certificateEmailSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FatwaQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "askerName" TEXT NOT NULL,
    "askerEmail" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answeredAt" DATETIME,
    "answeredById" TEXT,
    "featuredOnHomepage" BOOLEAN NOT NULL DEFAULT false,
    "featuredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FatwaQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FatwaQuestion_answeredById_fkey" FOREIGN KEY ("answeredById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContactInquiry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "reply" TEXT,
    "repliedAt" DATETIME,
    "repliedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContactInquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ContactInquiry_repliedById_fkey" FOREIGN KEY ("repliedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "amountInrPaise" INTEGER NOT NULL,
    "paidAt" DATETIME NOT NULL,
    "paymentType" TEXT,
    "description" TEXT,
    "receiptEmailSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentRecord_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "amountInrPaise" INTEGER NOT NULL,
    "paidAt" DATETIME NOT NULL,
    "description" TEXT,
    "teacherId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Expense_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SocialLinksSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "contactEmail" TEXT NOT NULL DEFAULT 'info@darsequranacademy.org',
    "whatsappNumber" TEXT NOT NULL DEFAULT '917006025120',
    "whatsappDefaultMessage" TEXT NOT NULL DEFAULT 'Assalamu Alaikum, I would like to know more about Darse Quran Academy.',
    "facebookUrl" TEXT NOT NULL DEFAULT 'https://facebook.com',
    "instagramUrl" TEXT NOT NULL DEFAULT 'https://instagram.com',
    "youtubeUrl" TEXT NOT NULL DEFAULT 'https://youtube.com',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PaymentSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "upiId" TEXT NOT NULL DEFAULT '',
    "upiPayeeName" TEXT NOT NULL DEFAULT 'Darse Quran Academy',
    "bankAccountName" TEXT NOT NULL DEFAULT 'Darse Quran Academy',
    "bankName" TEXT NOT NULL DEFAULT '',
    "bankAccountNumber" TEXT NOT NULL DEFAULT '',
    "bankIfsc" TEXT NOT NULL DEFAULT '',
    "bankBranch" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CoursePaymentSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CoursePaymentSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CoursePaymentSubmission_paymentRecordId_fkey" FOREIGN KEY ("paymentRecordId") REFERENCES "PaymentRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT NOT NULL,
    "readAt" DATETIME,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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

