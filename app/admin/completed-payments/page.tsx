import type { Metadata } from "next";
import Link from "next/link";
import { PaymentApprovalsTable } from "@/components/admin/PaymentApprovalsTable";
import { ManualTransactionsTable } from "@/components/admin/ManualTransactionsTable";
import { FinanceExpenseTable } from "@/components/admin/FinanceExpenseTable";
import { BookOrdersTable } from "@/components/admin/BookOrdersTable";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { getAllCourses } from "@/lib/courses";
import {
  getApprovedEnrollmentFeePaymentsPaginated,
  getApprovedMonthlyPaymentsPaginated,
} from "@/lib/monthly-payments";
import { getIncomeRecordsPaginated } from "@/lib/finance-income";
import { getExpensesPaginated } from "@/lib/finance-expenses";
import { parseFinanceFilters } from "@/lib/finance-filters";
import { getApprovedBookPaymentsPaginated } from "@/lib/bookstore";
import { APPROVAL_PAGE_SIZE, clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";
import { ActionToast } from "@/components/shared/ToastProvider";
import type { FinanceSearchParams } from "@/lib/finance-filters";

export const metadata: Metadata = {
  title: "Completed Payments — Admin",
  description: "View all completed payments including approved course fees, enrollment fees, book orders, and manually recorded transactions.",
};

type TabType =
  | "enrollment_approved"
  | "monthly_approved"
  | "book_approved"
  | "manual_transactions"
  | "manual_expenses";

const ALL_TABS: TabType[] = [
  "enrollment_approved",
  "monthly_approved",
  "book_approved",
  "manual_transactions",
  "manual_expenses",
];

const APPROVAL_TABLE_TABS = new Set<TabType>(["enrollment_approved", "monthly_approved"]);

function tabHref(type: TabType, extraParams?: Record<string, string>) {
  const params = new URLSearchParams(extraParams);
  if (type !== "enrollment_approved") params.set("type", type);
  const qs = params.toString();
  return qs ? `/admin/completed-payments?${qs}` : "/admin/completed-payments";
}

function TabLink({
  value,
  label,
  active,
}: {
  value: TabType;
  label: string;
  active: boolean;
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
    </Link>
  );
}

type SearchParams = {
  type?: string;
  deleted?: string;
  page?: string;
  q?: string;
} & FinanceSearchParams;

export default async function AdminCompletedPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = parseSearchQuery(params.q);

  const type: TabType = ALL_TABS.includes(params.type as TabType)
    ? (params.type as TabType)
    : "enrollment_approved";

  const isApprovalTab = APPROVAL_TABLE_TABS.has(type);
  const isBookApproved = type === "book_approved";
  const isManualTransactions = type === "manual_transactions";
  const isManualExpenses = type === "manual_expenses";

  const { page: requestedPage, pageSize } = parsePaginationParams(params, {
    pageSize: APPROVAL_PAGE_SIZE,
  });

  // Parse finance filters; default to all_time so all entries are shown
  const financeFilters = parseFinanceFilters({ ...params, preset: params.preset ?? "all_time" });

  const [
    courses,
    activeApprovalResult,
    activeBookResult,
    activeIncomeResult,
    activeExpenseResult,
  ] = await Promise.all([
    getAllCourses(),
    // Approved enrollment / course fee tabs
    isApprovalTab
      ? (type === "enrollment_approved"
          ? getApprovedEnrollmentFeePaymentsPaginated(requestedPage, pageSize, q)
          : getApprovedMonthlyPaymentsPaginated(requestedPage, pageSize, q))
      : Promise.resolve({ items: [], totalCount: 0 }),
    // Approved book order payments tab
    isBookApproved
      ? getApprovedBookPaymentsPaginated(requestedPage, pageSize, q)
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

  const activeTotal = isManualTransactions
    ? activeIncomeResult.totalCount
    : isManualExpenses
    ? activeExpenseResult.totalCount
    : isBookApproved
    ? activeBookResult.totalCount
    : activeApprovalResult.totalCount;

  const safePage = clampPage(requestedPage, activeTotal, pageSize);
  const titleById = new Map(courses.map((c) => [c.id, c.title]));

  const tabDefs = [
    { label: "Enrollment Fee Approved", value: "enrollment_approved" as TabType },
    { label: "Course Fee Approved", value: "monthly_approved" as TabType },
    { label: "Book Order Payments", value: "book_approved" as TabType },
    { label: "Manually Added Transactions", value: "manual_transactions" as TabType },
    { label: "Manually Added Expenses", value: "manual_expenses" as TabType },
  ];

  const preserveParams = type !== "enrollment_approved" ? { type } : undefined;

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary">Completed Payments</h1>
      <p className="mt-1 text-sm text-muted">
        View all completed payments including approved course fees, enrollment fees, book orders, and manually recorded transactions.
      </p>

      <ActionToast
        trigger={params.deleted === "1"}
        paramName="deleted"
        message="Record successfully deleted."
        variant="info"
      />

      {/* Tab Navigation */}
      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Completed payment type">
        {tabDefs.map((item) => (
          <TabLink
            key={item.value}
            value={item.value}
            label={item.label}
            active={type === item.value}
          />
        ))}
      </nav>

      {/* Tab Content */}
      <section id={type} className="mt-6">
        <div className="mb-2">
          <ListSearchForm
            action="/admin/completed-payments"
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
          ) : isBookApproved ? (
            <BookOrdersTable
              orders={activeBookResult.items}
              emptyMessage={
                q
                  ? "No book order payments match your search."
                  : "No approved book order payments found."
              }
              showStatusColumn={true}
              mode="payment_only"
            />
          ) : isManualTransactions ? (
            <ManualTransactionsTable records={activeIncomeResult.items} />
          ) : (
            <FinanceExpenseTable
              expenses={activeExpenseResult.items}
              returnQuery={(() => {
                const rest = { ...params };
                delete rest.type;
                delete rest.deleted;
                return rest;
              })()}
              basePath="/admin/completed-payments"
            />
          )}
        </div>

        <Pagination
          basePath="/admin/completed-payments"
          params={params}
          page={safePage}
          totalCount={activeTotal}
          pageSize={pageSize}
        />
      </section>
    </div>
  );
}
