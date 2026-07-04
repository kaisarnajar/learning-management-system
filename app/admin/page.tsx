import Link from "next/link";
import { ADMIN_DASHBOARD_LINK_HREFS, ADMIN_NAV_LINKS, ADMIN_NAV_GROUPS } from "@/lib/admin-nav";
import { getPendingBlogApprovalCount } from "@/lib/blog-approval";
import { getBookCount, getPendingBookOrderCount } from "@/lib/bookstore";
import { getPendingContactInquiryCount } from "@/lib/contact-inquiries";
import {
  getAwaitingEnrollmentFeeCount,
  getPendingEnrollmentApprovalCount,
} from "@/lib/enrollments";
import { getPendingStudentReviewCount } from "@/lib/student-reviews";
import { getPendingPaymentCount } from "@/lib/monthly-payments";
import { prisma } from "@/lib/prisma";
import { getStudentCount } from "@/lib/students";
import { withDbErrorHandling } from "@/lib/db-error";
import { requireAdmin } from "@/lib/auth-actions";

type DashboardStat = {
  label: string;
  href: string;
  count: number;
  highlight: boolean;
};

type DashboardLink = {
  label: string;
  href: string;
};

function DashboardCountCard({ stat }: { stat: DashboardStat }) {
  return (
    <Link
      href={stat.href}
      className={`rounded-lg border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md ${
        stat.highlight ? "border-warning-text/30 ring-1 ring-amber-200" : "border-border"
      }`}
    >
      <p className="text-sm text-muted">{stat.label}</p>
      <p className="mt-1 text-3xl font-bold text-foreground">{stat.count}</p>
    </Link>
  );
}

function DashboardLinkCard({ link }: { link: DashboardLink }) {
  return (
    <Link
      href={link.href}
      className="rounded-lg border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <p className="text-sm text-muted">{link.label}</p>
      <p className="mt-2 text-sm font-semibold text-primary">Manage →</p>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const session = await requireAdmin();
  const isDeveloper = session.user.role === "DEVELOPER";

  const [
    announcementCount,
    blogCount,
    dailyInspirationCount,
    courseCount,
    pendingEnrollmentCount,
    awaitingEnrollmentFeeCount,
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
  ] = await Promise.all([
    withDbErrorHandling(() => prisma.siteAnnouncement.count(), "Database operation failed"),
    withDbErrorHandling(() => prisma.blogPost.count(), "Database operation failed"),
    withDbErrorHandling(() => prisma.dailyInspiration.count(), "Database operation failed"),
    withDbErrorHandling(() => prisma.course.count(), "Database operation failed"),
    getPendingEnrollmentApprovalCount(),
    getAwaitingEnrollmentFeeCount(),
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
    withDbErrorHandling(() => prisma.paymentRecord.count({ where: { receiptGeneratedAt: { not: null } } }), "Database operation failed"),
    withDbErrorHandling(() => prisma.paymentRecord.count(), "Database operation failed"),
    withDbErrorHandling(() => prisma.expense.count(), "Database operation failed"),
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
        count: pendingEnrollmentCount + awaitingEnrollmentFeeCount,
        highlight: pendingEnrollmentCount + awaitingEnrollmentFeeCount > 0,
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
  ]);

  const countStats: DashboardStat[] = ADMIN_NAV_LINKS.filter(
    (link) => !ADMIN_DASHBOARD_LINK_HREFS.has(link.href),
  )
    .map((link) => {
      const meta = countByHref.get(link.href);
      if (!meta) return null;
      return {
        label: link.label,
        href: link.href,
        count: meta.count,
        highlight: meta.highlight ?? false,
      };
    })
    .filter((stat): stat is DashboardStat => stat !== null);

  const actionRequiredStats = countStats.filter((s) => s.highlight);
  const normalStats = countStats.filter((s) => !s.highlight);

  const quickLinks: DashboardLink[] = ADMIN_NAV_LINKS.filter((link) =>
    ADMIN_DASHBOARD_LINK_HREFS.has(link.href),
  ).map((link) => ({
    label: link.label,
    href: link.href,
  }));

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary sm:text-3xl">Dashboard</h1>
      <p className="mt-2 text-sm text-muted">Manage academy content and pending approvals.</p>

      {actionRequiredStats.length > 0 && (
        <section className="mt-8">
          <h2 className="font-serif text-lg font-semibold text-amber-600 dark:text-amber-500">Action Required</h2>
          <p className="mt-1 text-sm text-muted">Items that need your immediate attention.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {actionRequiredStats.map((stat) => (
              <DashboardCountCard key={stat.href} stat={stat} />
            ))}
          </div>
        </section>
      )}

      {ADMIN_NAV_GROUPS.map((group) => {
        const groupCountStats = normalStats.filter((stat) =>
          group.links.some((l) => l.href === stat.href)
        );
        const groupQuickLinks = quickLinks.filter((link) =>
          group.links.some((l) => l.href === link.href)
        );

        if (groupCountStats.length === 0 && groupQuickLinks.length === 0) {
          return null;
        }

        return (
          <section key={group.title} className="mt-10">
            <h2 className="font-serif text-lg font-semibold text-foreground">{group.title}</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.links.map((link) => {
                const countStat = groupCountStats.find((s) => s.href === link.href);
                if (countStat) return <DashboardCountCard key={countStat.href} stat={countStat} />;
                
                const quickLink = groupQuickLinks.find((q) => q.href === link.href);
                if (quickLink) return <DashboardLinkCard key={quickLink.href} link={quickLink} />;
                
                return null;
              })}
            </div>
          </section>
        );
      })}

    </div>
  );
}
