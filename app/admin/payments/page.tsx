import Link from "next/link";
import { PaymentApprovalsTable } from "@/components/admin/PaymentApprovalsTable";
import { RecordPaymentForm } from "@/components/admin/RecordPaymentForm";
import { RecordExpenseForm } from "@/components/admin/RecordExpenseForm";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { getAllCourses } from "@/lib/courses";
import { getAllTeachers } from "@/lib/teachers";
import {
  getPendingEnrollmentFeePaymentsPaginated,
  getApprovedEnrollmentFeePaymentsPaginated,
  getPendingMonthlyPaymentsPaginated,
  getApprovedMonthlyPaymentsPaginated,
} from "@/lib/monthly-payments";
import { APPROVAL_PAGE_SIZE, clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";
import { ActionToast } from "@/components/shared/ToastProvider";


type TabType =
  | "enrollment_pending"
  | "enrollment_approved"
  | "monthly_pending"
  | "monthly_approved"
  | "record_payment"
  | "record_expense";

const PENDING_TABS: TabType[] = ["enrollment_pending", "monthly_pending"];
const COMPLETED_TABS: TabType[] = [
  "enrollment_approved",
  "monthly_approved",
  "record_payment",
  "record_expense",
];
const ALL_TABS: TabType[] = [...PENDING_TABS, ...COMPLETED_TABS];

/** Tabs that show the approval table (not a form). */
const TABLE_TABS = new Set<TabType>([
  "enrollment_pending",
  "monthly_pending",
  "enrollment_approved",
  "monthly_approved",
]);

function tabHref(type: TabType) {
  const params = new URLSearchParams();
  if (type !== "enrollment_pending") params.set("type", type);
  const qs = params.toString();
  return qs ? `/admin/payments?${qs}` : "/admin/payments";
}

function TabLink({
  value,
  label,
  active,
  badgeCount,
}: {
  value: TabType;
  label: string;
  active: boolean;
  badgeCount?: number;
}) {
  return (
    <Link
      href={tabHref(value)}
      className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-white"
          : "bg-surface text-foreground hover:bg-accent-muted/50 border border-border"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {label}
      {badgeCount !== undefined && badgeCount > 0 && (
        <span
          className={`ml-2 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
            active ? "bg-surface/20 text-white" : "bg-warning-bg text-warning-text"
          }`}
        >
          {badgeCount}
        </span>
      )}
    </Link>
  );
}

export default async function AdminPaymentApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    confirmed?: string;
    declined?: string;
    deleted?: string;
    saved?: string;
    page?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const q = parseSearchQuery(params.q);

  const type: TabType = ALL_TABS.includes(params.type as TabType)
    ? (params.type as TabType)
    : "enrollment_pending";

  const isFormTab = !TABLE_TABS.has(type);

  const { page: requestedPage, pageSize } = parsePaginationParams(params, {
    pageSize: APPROVAL_PAGE_SIZE,
  });

  // Always fetch pending counts for badges; only fetch table data for table tabs
  const [
    courses,
    teachers,
    pendingEnrollmentResult,
    pendingMonthlyResult,
    activeResult,
  ] = await Promise.all([
    getAllCourses(),
    getAllTeachers(),
    getPendingEnrollmentFeePaymentsPaginated(1, 1, q),
    getPendingMonthlyPaymentsPaginated(1, 1, q),
    TABLE_TABS.has(type)
      ? (type === "enrollment_pending"
          ? getPendingEnrollmentFeePaymentsPaginated(requestedPage, pageSize, q)
          : type === "enrollment_approved"
          ? getApprovedEnrollmentFeePaymentsPaginated(requestedPage, pageSize, q)
          : type === "monthly_pending"
          ? getPendingMonthlyPaymentsPaginated(requestedPage, pageSize, q)
          : getApprovedMonthlyPaymentsPaginated(requestedPage, pageSize, q))
      : Promise.resolve({ items: [], totalCount: 0 }),
  ]);

  const pendingEnrollmentCount = pendingEnrollmentResult.totalCount;
  const pendingMonthlyCount = pendingMonthlyResult.totalCount;

  const safePage = clampPage(requestedPage, activeResult.totalCount, pageSize);
  const titleById = new Map(courses.map((c) => [c.id, c.title]));

  const pendingTabDefs = [
    {
      label: "Enrollment Fee Pending",
      value: "enrollment_pending" as TabType,
      badgeCount: pendingEnrollmentCount,
    },
    {
      label: "Course Fee Pending",
      value: "monthly_pending" as TabType,
      badgeCount: pendingMonthlyCount,
    },
  ];

  const completedTabDefs = [
    { label: "Enrollment Fee Approved", value: "enrollment_approved" as TabType },
    { label: "Course Fee Approved", value: "monthly_approved" as TabType },
    { label: "Record Payment", value: "record_payment" as TabType },
    { label: "Record Expense", value: "record_expense" as TabType },
  ];

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary">Payments &amp; Finance</h1>
      <p className="mt-1 text-sm text-muted">
        Verify student payments, approve or decline submissions, and record manual transactions.
      </p>

      <ActionToast
        trigger={params.confirmed === "1"}
        paramName="confirmed"
        message="Payment approved and recorded. The student has been notified by email — if they don't see it, ask them to check their Spam/Junk folder."
        variant="info"
      />
      <ActionToast
        trigger={params.declined === "1"}
        paramName="declined"
        message="Payment declined. The student has been notified by email and can resubmit. If they don't see it, ask them to check their Spam/Junk folder."
        variant="warning"
      />
      <ActionToast
        trigger={params.deleted === "1"}
        paramName="deleted"
        message="Payment record successfully deleted."
        variant="info"
      />
      <ActionToast
        trigger={params.saved === "1"}
        paramName="saved"
        message="Transaction recorded successfully."
        variant="info"
      />

      {/* ── Pending Payments ─────────────────────────────── */}
      <div className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          Pending Payments
        </h2>
        <nav className="flex flex-wrap gap-2" aria-label="Pending payment type">
          {pendingTabDefs.map((item) => (
            <TabLink
              key={item.value}
              value={item.value}
              label={item.label}
              active={type === item.value}
              badgeCount={item.badgeCount}
            />
          ))}
        </nav>
      </div>

      {/* ── Completed Payments ───────────────────────────── */}
      <div className="mt-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          Completed Payments
        </h2>
        <nav className="flex flex-wrap gap-2" aria-label="Completed payment type">
          {completedTabDefs.map((item) => (
            <TabLink
              key={item.value}
              value={item.value}
              label={item.label}
              active={type === item.value}
            />
          ))}
        </nav>
      </div>

      {/* ── Tab Content ──────────────────────────────────── */}
      {isFormTab ? (
        <div className="mt-8 max-w-2xl">
          {type === "record_payment" ? (
            <>
              <p className="mb-4 text-sm text-muted">
                Manually log a payment received from a student.
              </p>
              <RecordPaymentForm
                courses={courses.map((c) => ({ id: c.id, title: c.title }))}
              />
            </>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted">
                Manually log an operational expense for the academy.
              </p>
              <RecordExpenseForm
                teachers={teachers.map((t) => ({ id: t.id, name: t.name }))}
              />
            </>
          )}
        </div>
      ) : (
        <section id={type} className="mt-6">
          <div className="mb-2">
            <ListSearchForm
              action="/admin/payments"
              query={q}
              preserveParams={{ type: type !== "enrollment_pending" ? type : undefined }}
              totalCount={activeResult.totalCount}
              placeholder="Search by name, email, course, or reference..."
            />
          </div>
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
      )}
    </div>
  );
}
