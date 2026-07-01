import Link from "next/link";
import { FinanceDateFilter } from "@/components/admin/FinanceDateFilter";
import { FinanceExpenseFilters } from "@/components/admin/FinanceExpenseFilters";
import { FinanceExpenseTable } from "@/components/admin/FinanceExpenseTable";
import { FinanceFilteredSummary } from "@/components/admin/FinanceFilteredSummary";
import { FinanceIncomeFilters } from "@/components/admin/FinanceIncomeFilters";
import { FinanceIncomeTable } from "@/components/admin/FinanceIncomeTable";
import { FinanceSummaryCards } from "@/components/admin/FinanceSummaryCards";
import { FinanceTabs } from "@/components/admin/FinanceTabs";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { getAllCourses } from "@/lib/courses";
import { getExpensesPaginated, getExpenseTotal } from "@/lib/finance-expenses";
import {
  buildFinanceSearchPreserveParams,
  parseFinanceFilters,
  type FinanceSearchParams,
} from "@/lib/finance-filters";
import { getIncomeRecordsPaginated, getIncomeTotal } from "@/lib/finance-income";
import { clampPage, parsePaginationParams } from "@/lib/pagination";
import { getStudentUsers } from "@/lib/students";
import { getAllTeachers } from "@/lib/teachers";
import { ActionToast } from "@/components/shared/ToastProvider";


export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<FinanceSearchParams>;
}) {
  const params = await searchParams;
  const filters = parseFinanceFilters(params);
  const { page: requestedPage, pageSize } = parsePaginationParams(params);

  const dateOnlyFilters = {
    preset: filters.preset,
    from: filters.from,
    to: filters.to,
    tab: filters.tab,
  };

  const [
    incomeTotal,
    expenseTotal,
    incomePaginated,
    expensesPaginated,
    filteredIncomeTotal,
    filteredExpenseTotal,
    courses,
    students,
    teachers,
  ] = await Promise.all([
    getIncomeTotal(dateOnlyFilters),
    getExpenseTotal(dateOnlyFilters),
    getIncomeRecordsPaginated(filters, requestedPage, pageSize),
    getExpensesPaginated(filters, requestedPage, pageSize),
    getIncomeTotal(filters),
    getExpenseTotal(filters),
    getAllCourses(),
    getStudentUsers(),
    getAllTeachers(),
  ]);

  const incomeRecords = incomePaginated.items;
  const expenses = expensesPaginated.items;
  const incomeTotalCount = incomePaginated.totalCount;
  const expenseTotalCount = expensesPaginated.totalCount;
  const page = clampPage(
    requestedPage,
    filters.tab === "income" ? incomeTotalCount : expenseTotalCount,
    pageSize,
  );

  const returnQuery = params;
  const searchPreserveParams = buildFinanceSearchPreserveParams(filters);

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary">Finance</h1>
      <p className="mt-1 text-sm text-muted">
        Track student fee income and academy expenses. Summary totals use the selected date range.
      </p>

      <ActionToast trigger={params.saved === "1"} paramName="saved" message="Expense recorded." variant="info" />
      <ActionToast trigger={params.deleted === "1"} paramName="deleted" message="Expense deleted." variant="info" />
      {params.error && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text" role="alert">
          {decodeURIComponent(params.error)}
        </p>
      )}

      <div className="mt-6">
        <FinanceDateFilter filters={filters} />
      </div>

      <div className="mt-6">
        <FinanceSummaryCards incomeTotal={incomeTotal} expenseTotal={expenseTotal} />
      </div>

      <div className="mt-8">
        <FinanceTabs />
      </div>

      <div className="mt-6">
        <nav className="flex gap-4 border-b border-border mb-6">
          <Link
            href={`/admin/finance?${new URLSearchParams({ ...searchPreserveParams, tab: "income" }).toString()}`}
            className={`pb-2 text-sm font-medium border-b-2 ${filters.tab === "income" ? "border-primary text-primary" : "border-transparent text-muted hover:border-border hover:text-foreground"}`}
          >
            Income
          </Link>
          <Link
            href={`/admin/finance?${new URLSearchParams({ ...searchPreserveParams, tab: "expenses" }).toString()}`}
            className={`pb-2 text-sm font-medium border-b-2 ${filters.tab === "expenses" ? "border-primary text-primary" : "border-transparent text-muted hover:border-border hover:text-foreground"}`}
          >
            Expense
          </Link>
        </nav>

        {filters.tab === "income" ? (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Link
                href="/admin/transactions?tab=payments"
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light"
              >
                Record payment
              </Link>
            </div>

            <ListSearchForm
              action="/admin/finance"
              query={filters.q}
              placeholder="Search by student, course, or description"
              preserveParams={searchPreserveParams}
              totalCount={filters.q ? incomeTotalCount : undefined}
            />

            <FinanceIncomeFilters
              filters={filters}
              courses={courses.map((c) => ({ id: c.id, title: c.title }))}
              students={students.map((s) => ({ id: s.id, name: s.name, email: s.email }))}
            />

            <FinanceFilteredSummary
              recordCount={incomeTotalCount}
              totalPaise={filteredIncomeTotal}
              variant="income"
            />

            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <FinanceIncomeTable records={incomeRecords} />
            </div>

            <Pagination
              basePath="/admin/finance"
              params={params}
              page={page}
              totalCount={incomeTotalCount}
              pageSize={pageSize}
            />
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Link
                href="/admin/transactions?tab=expenses"
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light"
              >
                Record expense
              </Link>
            </div>

            <ListSearchForm
              action="/admin/finance"
              query={filters.q}
              placeholder="Search by description, category, or teacher"
              preserveParams={searchPreserveParams}
              totalCount={filters.q ? expenseTotalCount : undefined}
            />

            <FinanceExpenseFilters
              filters={filters}
              teachers={teachers.map((t) => ({ id: t.id, name: t.name }))}
            />

            <FinanceFilteredSummary
              recordCount={expenseTotalCount}
              totalPaise={filteredExpenseTotal}
              variant="expense"
            />

            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <FinanceExpenseTable expenses={expenses} returnQuery={returnQuery} />
            </div>

            <Pagination
              basePath="/admin/finance"
              params={params}
              page={page}
              totalCount={expenseTotalCount}
              pageSize={pageSize}
            />
          </section>
        )}
      </div>
    </div>
  );
}
