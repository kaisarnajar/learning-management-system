import Link from "next/link";
import { PaymentApprovalsTable } from "@/components/admin/PaymentApprovalsTable";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { getAllCourses } from "@/lib/courses";
import {
  getPendingEnrollmentFeePaymentsPaginated,
  getApprovedEnrollmentFeePaymentsPaginated,
  getPendingMonthlyPaymentsPaginated,
  getApprovedMonthlyPaymentsPaginated,
} from "@/lib/monthly-payments";
import { APPROVAL_PAGE_SIZE, clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";
import { ActionToast } from "@/components/shared/ToastProvider";


type TabType = "enrollment_pending" | "enrollment_approved" | "monthly_pending" | "monthly_approved";

function tabHref(type: TabType) {
  const params = new URLSearchParams();
  if (type !== "enrollment_pending") params.set("type", type);
  const qs = params.toString();
  return qs ? `/admin/payments?${qs}` : "/admin/payments";
}

export default async function AdminPaymentApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; confirmed?: string; declined?: string; deleted?: string; page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const q = parseSearchQuery(params.q);
  
  const validTypes: TabType[] = ["enrollment_pending", "enrollment_approved", "monthly_pending", "monthly_approved"];
  const type: TabType = validTypes.includes(params.type as TabType) ? (params.type as TabType) : "enrollment_pending";

  const { page: requestedPage, pageSize } = parsePaginationParams(params, {
    pageSize: APPROVAL_PAGE_SIZE,
  });

  const [courses, pendingEnrollmentResult, pendingMonthlyResult, activeResult] = await Promise.all([
    getAllCourses(),
    // We always fetch pending counts for the badges
    getPendingEnrollmentFeePaymentsPaginated(1, 1, q),
    getPendingMonthlyPaymentsPaginated(1, 1, q),
    // Fetch full data for the currently active tab
    type === "enrollment_pending" ? getPendingEnrollmentFeePaymentsPaginated(requestedPage, pageSize, q)
      : type === "enrollment_approved" ? getApprovedEnrollmentFeePaymentsPaginated(requestedPage, pageSize, q)
      : type === "monthly_pending" ? getPendingMonthlyPaymentsPaginated(requestedPage, pageSize, q)
      : getApprovedMonthlyPaymentsPaginated(requestedPage, pageSize, q),
  ]);

  const pendingEnrollmentCount = pendingEnrollmentResult.totalCount;
  const pendingMonthlyCount = pendingMonthlyResult.totalCount;

  // The activeResult already contains the items and totalCount we need for the current tab
  const safePage = clampPage(requestedPage, activeResult.totalCount, pageSize);

  const titleById = new Map(courses.map((c) => [c.id, c.title]));

  const tabs = [
    { label: "Enrollment Fee Pending", value: "enrollment_pending" as TabType, count: pendingEnrollmentCount, showBadge: true },
    { label: "Enrollment Fee Approved", value: "enrollment_approved" as TabType, count: 0, showBadge: false },
    { label: "Fee Pending", value: "monthly_pending" as TabType, count: pendingMonthlyCount, showBadge: true },
    { label: "Fee Approved", value: "monthly_approved" as TabType, count: 0, showBadge: false },
  ];

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary">Payments</h1>
      <p className="mt-1 text-sm text-muted">
        Verify enrollment and fee payments submitted by students. Free enrollment requests
        are managed under Enrollments.
      </p>
      
      <ActionToast trigger={params.confirmed === "1"} paramName="confirmed" message="Payment approved and recorded. The student has been notified by email — if they don't see it, ask them to check their Spam/Junk folder." variant="info" />
      <ActionToast trigger={params.declined === "1"} paramName="declined" message="Payment declined. The student has been notified by email and can resubmit. If they don't see it, ask them to check their Spam/Junk folder." variant="warning" />
      <ActionToast trigger={params.deleted === "1"} paramName="deleted" message="Payment record successfully deleted." variant="info" />

      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Payment approval type">
        {tabs.map((item) => {
          const active = type === item.value;
          const href = tabHref(item.value);
          return (
            <Link
              key={item.value}
              href={href}
              className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-white"
                  : "bg-surface text-foreground hover:bg-accent-muted/50"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
              {item.showBadge && item.count > 0 && (
                <span
                  className={`ml-2 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    active ? "bg-surface/20 text-white" : "bg-warning-bg text-warning-text"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 mb-2">
        <ListSearchForm
          action="/admin/payments"
          query={q}
          preserveParams={{ type: type !== "enrollment_pending" ? type : undefined }}
          totalCount={activeResult.totalCount}
          placeholder="Search by name, email, course, or reference..."
        />
      </div>

      <section id={type} className="mt-6">
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <PaymentApprovalsTable
            submissions={activeResult.items}
            courseTitleById={titleById}
            emptyMessage={
              q
                ? "No payments match your search."
                : "No payments found for this category."
            }
          />
        </div>
        <Pagination
          basePath="/admin/payments"
          params={params}
          page={safePage}
          totalCount={activeResult.totalCount}
          pageSize={pageSize}
        />
      </section>
    </div>
  );
}
