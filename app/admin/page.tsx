import Link from "next/link";
import { ADMIN_DASHBOARD_LINK_HREFS, ADMIN_NAV_LINKS } from "@/lib/admin-nav";
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
  ]);

  const countByHref = new Map<string, { count: number; highlight?: boolean }>([
    ["/admin/announcements", { count: announcementCount }],
    ["/admin/blogs", { count: blogCount }],
    ["/admin/daily-inspiration", { count: dailyInspirationCount }],
    ["/admin/courses", { count: courseCount }],
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
      { count: pendingPaymentCount, highlight: pendingPaymentCount > 0 },
    ],
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
    .filter((stat): stat is DashboardStat => stat !== null)
    .sort((a, b) => Number(a.highlight) - Number(b.highlight));

  const quickLinks: DashboardLink[] = ADMIN_NAV_LINKS.filter((link) =>
    ADMIN_DASHBOARD_LINK_HREFS.has(link.href),
  ).map((link) => ({
    label: link.label,
    href: link.href,
  }));

  if (isDeveloper) {
    quickLinks.push({
      label: "Analytics",
      href: "/developer/analytics",
    });
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary sm:text-3xl">Dashboard</h1>
      <p className="mt-2 text-sm text-muted">Manage academy content and pending approvals.</p>

      <section className="mt-8">
        <h2 className="font-serif text-lg font-semibold text-foreground">Overview</h2>
        <p className="mt-1 text-sm text-muted">Counts for content, people, and pending items.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {countStats.map((stat) => (
            <DashboardCountCard key={stat.href} stat={stat} />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-lg font-semibold text-foreground">Quick links</h2>
        <p className="mt-1 text-sm text-muted">
          Payment settings, finance, expenses, and other academy tools.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <DashboardLinkCard key={link.href} link={link} />
          ))}
        </div>
      </section>
    </div>
  );
}
