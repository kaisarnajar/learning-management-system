import Link from "next/link";
import { PaymentApprovalsTable } from "@/components/admin/PaymentApprovalsTable";
import { ManualTransactionsTable } from "@/components/admin/ManualTransactionsTable";
import { FinanceExpenseTable } from "@/components/admin/FinanceExpenseTable";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { getAllCourses } from "@/lib/courses";
import {
  getPendingEnrollmentFeePaymentsPaginated,
  getApprovedEnrollmentFeePaymentsPaginated,
  getPendingMonthlyPaymentsPaginated,
  getApprovedMonthlyPaymentsPaginated,
} from "@/lib/monthly-payments";
import { getIncomeRecordsPaginated } from "@/lib/finance-income";
import { getExpensesPaginated } from "@/lib/finance-expenses";
import { parseFinanceFilters } from "@/lib/finance-filters";
import { APPROVAL_PAGE_SIZE, clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";
import { ActionToast } from "@/components/shared/ToastProvider";
import type { FinanceSearchParams } from "@/lib/finance-filters";


type TabType =
  | "enrollment_pending"
  | "enrollment_approved"
  | "monthly_pending"
  | "monthly_approved"
  | "manual_transactions"
  | "manual_expenses";

const PENDING_TABS: TabType[] = ["enrollment_pending", "monthly_pending"];
const COMPLETED_TABS: TabType[] = [
  "enrollment_approved",
  "monthly_approved",
  "manual_transactions",
  "manual_expenses",
];
const ALL_TABS: TabType[] = [...PENDING_TABS, ...COMPLETED_TABS];

/** Approval table tabs (CoursePaymentSubmission data). */
const APPROVAL_TABLE_TABS = new Set<TabType>([
  "enrollment_pending",
  "monthly_pending",
  "enrollment_approved",
  "monthly_approved",
]);

function tabHref(type: TabType, extraParams?: Record<string, string>) {
  const params = new URLSearchParams(extraParams);
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

type SearchParams = {
  type?: string;
  confirmed?: string;
  declined?: string;
  deleted?: string;
  page?: string;
  q?: string;
} & FinanceSearchParams;

export default async function AdminPaymentApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = parseSearchQuery(params.q);

  const type: TabType = ALL_TABS.includes(params.type as TabType)
    ? (params.type as TabType)
    : "enrollment_pending";

  const isApprovalTab = APPROVAL_TABLE_TABS.has(type);
  const isManualTransactions = type === "manual_transactions";
  const isManualExpenses = type === "manual_expenses";

  const { page: requestedPage, pageSize } = parsePaginationParams(params, {
    pageSize: APPROVAL_PAGE_SIZE,
  });

  // Parse finance filters (used for manual_transactions / manual_expenses)
  // Default to all_time so all manually recorded entries show up
  const financeFilters = parseFinanceFilters({ ...params, preset: params.preset ?? "all_time" });

  // Fetch pending badge counts + active tab data in parallel
  const [
    courses,
    pendingEnrollmentResult,
    pendingMonthlyResult,
    activeApprovalResult,
    activeIncomeResult,
    activeExpenseResult,
  ] = await Promise.all([
    getAllCourses(),
    getPendingEnrollmentFeePaymentsPaginated(1, 1, q),
    getPendingMonthlyPaymentsPaginated(1, 1, q),
    // Approval table tabs
    isApprovalTab
      ? (type === "enrollment_pending"
          ? getPendingEnrollmentFeePaymentsPaginated(requestedPage, pageSize, q)
          : type === "enrollment_approved"
          ? getApprovedEnrollmentFeePaymentsPaginated(requestedPage, pageSize, q)
          : type === "monthly_pending"
          ? getPendingMonthlyPaymentsPaginated(requestedPage, pageSize, q)
          : getApprovedMonthlyPaymentsPaginated(requestedPage, pageSize, q))
      : Promise.resolve({ items: [], totalCount: 0 }),
    // Manually added transactions tab
    isManualTransactions
      ? getIncomeRecordsPaginated({ ...financeFilters, onlyManual: true, q: q ?? undefined }, requestedPage, pageSize)
      : Promise.resolve({ items: [], totalCount: 0 }),
    // Manually added expenses tab
    isManualExpenses
      ? getExpensesPaginated({ ...financeFilters, onlyManual: true, q: q ?? undefined }, requestedPage, pageSize)
      : Promise.resolve({ items: [], totalCount: 0 }),
  ]);

  const pendingEnrollmentCount = pendingEnrollmentResult.totalCount;
  const pendingMonthlyCount = pendingMonthlyResult.totalCount;

  const activeTotal = isManualTransactions
    ? activeIncomeResult.totalCount
    : isManualExpenses
    ? activeExpenseResult.totalCount
    : activeApprovalResult.totalCount;

  const safePage = clampPage(requestedPage, activeTotal, pageSize);
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
    { label: "Manually Added Transactions", value: "manual_transactions" as TabType },
    { label: "Manually Added Expenses", value: "manual_expenses" as TabType },
  ];

  const preserveParams = type !== "enrollment_pending" ? { type } : undefined;

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary">Payments</h1>
      <p className="mt-1 text-sm text-muted">
        Verify enrollment and fee payments submitted by students. Free enrollment requests
        are managed under Enrollments.
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

      {/* ── Pending Payments ─────────────────────────── */}
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

      {/* ── Completed Payments ───────────────────────── */}
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

      {/* ── Tab Content ─────────────────────────────── */}
      <section id={type} className="mt-6">
        <div className="mb-2">
          <ListSearchForm
            action="/admin/payments"
            query={q}
            preserveParams={preserveParams}
            totalCount={activeTotal}
            placeholder="Search by name, email, course, or reference..."
          />
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          {isApprovalTab ? (
            <PaymentApprovalsTable
              submissions={activeApprovalResult.items}
              courseTitleById={titleById}
              emptyMessage={
                q
                  ? "No payments match your search."
                  : "No payments found for this category."
              }
            />
          ) : isManualTransactions ? (
            <ManualTransactionsTable records={activeIncomeResult.items} />
          ) : (
            <FinanceExpenseTable
              expenses={activeExpenseResult.items}
              returnQuery={(({ type: _type, confirmed: _c, declined: _d, deleted: _del, ...rest }) => rest)(params)}
              basePath="/admin/payments"
            />
          )}
        </div>

        <Pagination
          basePath="/admin/payments"
          params={params}
          page={safePage}
          totalCount={activeTotal}
          pageSize={pageSize}
        />
      </section>
    </div>
  );
}
