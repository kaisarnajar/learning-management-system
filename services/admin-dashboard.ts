import { getPendingBlogApprovalCount } from "@/services/blog-approval";
import { getBookCount, getPendingBookOrderCount } from "@/services/bookstore";
import { getPendingContactInquiryCount } from "@/services/contact-inquiries";
import { getPendingEnrollmentApprovalCount } from "@/services/enrollments";
import { getPendingStudentReviewCount } from "@/services/student-reviews";
import { getPendingPaymentCount } from "@/services/monthly-payments";
import { prisma } from "@/utils/prisma";
import { getStudentCount } from "@/services/students";
import { withDbErrorHandling } from "@/utils/db-error";

export type DashboardCount = { count: number; highlight?: boolean };

/**
 * The admin dashboard's numbers, keyed by the admin page they link to. A
 * highlighted count is work waiting for an admin. Used by /admin and by the
 * app's dashboard (/api/v1/admin/dashboard).
 */
export async function getAdminDashboardCounts(): Promise<Map<string, DashboardCount>> {
  const [
    announcementCount,
    blogCount,
    dailyInspirationCount,
    courseCount,
    pendingEnrollmentCount,
    studentCount,
    teacherCount,
    libraryCount,
    bookCount,
    pendingBookOrderCount,
    pendingFatwaCount,
    pendingContactCount,
    pendingBlogCount,
    pendingReviewCount,
    pendingPaymentCount,
    certificateCount,
    receiptCount,
    paymentRecordCount,
    expenseCount,
    pendingWaiverCount,
  ] = await Promise.all([
    withDbErrorHandling(() => prisma.siteAnnouncement.count(), "Database operation failed"),
    withDbErrorHandling(() => prisma.blogPost.count(), "Database operation failed"),
    withDbErrorHandling(() => prisma.dailyInspiration.count(), "Database operation failed"),
    withDbErrorHandling(() => prisma.course.count(), "Database operation failed"),
    getPendingEnrollmentApprovalCount(),
    getStudentCount(),
    withDbErrorHandling(() => prisma.teacher.count(), "Database operation failed"),
    withDbErrorHandling(() => prisma.libraryItem.count(), "Database operation failed"),
    getBookCount(),
    getPendingBookOrderCount(),
    withDbErrorHandling(() => prisma.fatwaQuestion.count({ where: { answer: null } }), "Database operation failed"),
    getPendingContactInquiryCount(),
    getPendingBlogApprovalCount(),
    getPendingStudentReviewCount(),
    getPendingPaymentCount(),
    withDbErrorHandling(() => prisma.enrollment.count({ where: { certificateGeneratedAt: { not: null } } }), "Database operation failed"),
    withDbErrorHandling(() => prisma.paymentRecord.count({ where: { receiptGeneratedAt: { not: null }, voidedAt: null } }), "Database operation failed"),
    withDbErrorHandling(() => prisma.paymentRecord.count({ where: { voidedAt: null } }), "Database operation failed"),
    withDbErrorHandling(() => prisma.expense.count(), "Database operation failed"),
    withDbErrorHandling(() => prisma.couponRequest.count({ where: { status: "PENDING" } }), "Database operation failed"),
  ]);

  const countByHref = new Map<string, { count: number; highlight?: boolean }>([
    ["/admin/announcements", { count: announcementCount }],
    ["/admin/blogs", { count: blogCount }],
    ["/admin/daily-inspiration", { count: dailyInspirationCount }],
    ["/admin/courses", { count: courseCount }],
    ["/admin/certificates", { count: certificateCount }],
    [
      "/admin/enrollments",
      {
        count: pendingEnrollmentCount,
        highlight: pendingEnrollmentCount > 0,
      },
    ],
    ["/admin/students", { count: studentCount }],
    ["/admin/teachers", { count: teacherCount }],
    ["/admin/library", { count: libraryCount }],
    ["/admin/bookstore", { count: bookCount }],
    [
      "/admin/bookstore/orders",
      { count: pendingBookOrderCount, highlight: pendingBookOrderCount > 0 },
    ],
    ["/admin/fatwa", { count: pendingFatwaCount, highlight: pendingFatwaCount > 0 }],
    [
      "/admin/contact-inquiries",
      { count: pendingContactCount, highlight: pendingContactCount > 0 },
    ],
    ["/admin/blog-approvals", { count: pendingBlogCount, highlight: pendingBlogCount > 0 }],
    [
      "/admin/review-approvals",
      { count: pendingReviewCount, highlight: pendingReviewCount > 0 },
    ],
    [
      "/admin/payments",
      {
        count: pendingPaymentCount,
        highlight: pendingPaymentCount > 0,
      },
    ],
    ["/admin/completed-payments", { count: paymentRecordCount + expenseCount }],
    ["/admin/receipts", { count: receiptCount }],
    ["/admin/finance", { count: 0 }],
    [
      "/admin/coupons",
      {
        count: pendingWaiverCount,
        highlight: pendingWaiverCount > 0,
      },
    ],
    ["/admin/coupons/finance", { count: 0 }],
  ]);

  return countByHref;
}
