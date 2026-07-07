import {
  CourseStatus,
  BlogApprovalStatus,
  FatwaApprovalStatus,
  StudentReviewStatus,
  BookStatus,
  BookOrderStatus,
  AnnouncementCategory,
  DailyInspirationKind
} from "@prisma/client";

/**
 * Standard Roles across the application
 */
export const ROLES = {
  ADMIN: "admin",
  TEACHER: "teacher",
  STUDENT: "student",
} as const;

/**
 * Common enrollment statuses (stored as strings in the DB for now)
 */
export const ENROLLMENT_STATUS = {
  PENDING: "pending_approval",
  AWAITING_FEE: "awaiting_enrollment_fee",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export const ENROLLMENT_STATUS_UI: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "outline" }> = {
  [ENROLLMENT_STATUS.PENDING]: { label: "Pending", variant: "warning" },
  [ENROLLMENT_STATUS.AWAITING_FEE]: { label: "Awaiting Fee", variant: "outline" },
  [ENROLLMENT_STATUS.APPROVED]: { label: "Approved", variant: "success" },
  [ENROLLMENT_STATUS.REJECTED]: { label: "Rejected", variant: "destructive" },
};

export const COURSE_STATUS_UI: Record<CourseStatus, { label: string; variant: "default" | "success" | "warning" | "destructive" | "outline" }> = {
  [CourseStatus.DRAFT]: { label: "Draft", variant: "outline" },
  [CourseStatus.PUBLISHED]: { label: "Published", variant: "success" },
  [CourseStatus.ONGOING]: { label: "Ongoing", variant: "default" },
  [CourseStatus.COMPLETED]: { label: "Completed", variant: "outline" },
  [CourseStatus.ON_HOLD]: { label: "On Hold", variant: "warning" },
};

export const BLOG_STATUS_UI: Record<BlogApprovalStatus, { label: string; variant: "default" | "success" | "warning" | "destructive" | "outline" }> = {
  [BlogApprovalStatus.DRAFT]: { label: "Draft", variant: "outline" },
  [BlogApprovalStatus.PENDING]: { label: "Pending Approval", variant: "warning" },
  [BlogApprovalStatus.APPROVED]: { label: "Approved", variant: "success" },
  [BlogApprovalStatus.REJECTED]: { label: "Rejected", variant: "destructive" },
};

export const FATWA_STATUS_UI: Record<FatwaApprovalStatus, { label: string; variant: "default" | "success" | "warning" | "destructive" | "outline" }> = {
  [FatwaApprovalStatus.PENDING]: { label: "Pending", variant: "warning" },
  [FatwaApprovalStatus.APPROVED]: { label: "Answered", variant: "success" },
  [FatwaApprovalStatus.REJECTED]: { label: "Rejected", variant: "destructive" },
};

export const REVIEW_STATUS_UI: Record<StudentReviewStatus, { label: string; variant: "default" | "success" | "warning" | "destructive" | "outline" }> = {
  [StudentReviewStatus.PENDING]: { label: "Pending", variant: "warning" },
  [StudentReviewStatus.APPROVED]: { label: "Approved", variant: "success" },
  [StudentReviewStatus.REJECTED]: { label: "Rejected", variant: "destructive" },
};

export const BOOK_STATUS_UI: Record<BookStatus, { label: string; variant: "default" | "success" | "warning" | "destructive" | "outline" }> = {
  [BookStatus.AVAILABLE]: { label: "Available", variant: "success" },
  [BookStatus.OUT_OF_STOCK]: { label: "Out of Stock", variant: "destructive" },
  [BookStatus.COMING_SOON]: { label: "Coming Soon", variant: "warning" },
};

export const BOOK_ORDER_STATUS_UI: Record<BookOrderStatus, { label: string; variant: "default" | "success" | "warning" | "destructive" | "outline" }> = {
  [BookOrderStatus.PENDING_VERIFICATION]: { label: "Pending Verification", variant: "warning" },
  [BookOrderStatus.APPROVED]: { label: "Approved", variant: "default" },
  [BookOrderStatus.DECLINED]: { label: "Declined", variant: "destructive" },
  [BookOrderStatus.SHIPPED]: { label: "Shipped", variant: "success" },
  [BookOrderStatus.REFUNDED]: { label: "Refunded", variant: "outline" },
};

export const ANNOUNCEMENT_CATEGORY_UI: Record<AnnouncementCategory, string> = {
  [AnnouncementCategory.EXAMS_TESTS]: "Exams & Tests",
  [AnnouncementCategory.ASSIGNMENTS_HOMEWORK]: "Assignments & Homework",
  [AnnouncementCategory.STUDY_MATERIALS]: "Study Materials",
  [AnnouncementCategory.CLASS_SCHEDULE]: "Class Schedule",
  [AnnouncementCategory.COURSE_ANNOUNCEMENT]: "Course Announcement",
  [AnnouncementCategory.GENERAL_NOTICE]: "General Notice",
};

export const DAILY_INSPIRATION_UI: Record<DailyInspirationKind, string> = {
  [DailyInspirationKind.QURAN]: "Quran",
  [DailyInspirationKind.HADITH]: "Hadith",
};

/**
 * Standard Pagination Settings
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 15,
  MAX_PAGE_SIZE: 50,
} as const;

export const DOCUMENT_TYPES = {
  CERTIFICATE: "certificate",
  PAYMENT_RECEIPT: "payment_receipt",
  GRADE_CARD: "grade_card",
  ATTENDANCE_CARD: "attendance_card",
  ID_CARD: "id_card",
} as const;
