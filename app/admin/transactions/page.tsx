import Link from "next/link";
import { FinanceExpenseTable } from "@/components/admin/FinanceExpenseTable";
import { FinanceIncomeTable } from "@/components/admin/FinanceIncomeTable";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { getExpensesPaginated } from "@/lib/finance-expenses";
import {
  buildFinanceSearchPreserveParams,
  parseFinanceFilters,
  type FinanceSearchParams,
} from "@/lib/finance-filters";
import { getIncomeRecordsPaginated } from "@/lib/finance-income";
import { clampPage, parsePaginationParams } from "@/lib/pagination";
import { ActionToast } from "@/components/shared/ToastProvider";

type TabType = "payments" | "expenses";

function tabHref(type: TabType) {
  const params = new URLSearchParams();
  if (type !== "payments") params.set("tab", type);
  const qs = params.toString();
  return qs ? `/admin/transactions?${qs}` : "/admin/transactions";
}

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<FinanceSearchParams & { tab?: string }>;
}) {
  const params = await searchParams;
  const filters = parseFinanceFilters(params);
  const { page: requestedPage, pageSize } = parsePaginationParams(params);

  const tab: TabType = params.tab === "expenses" ? "expenses" : "payments";
  // We use the same filters for transactions as finance but map the tab concept
  const effectiveFilters = { ...filters, tab: tab === "payments" ? "income" as const : "expenses" as const };

  const [
    incomePaginated,
    expensesPaginated,
  ] = await Promise.all([
    tab === "payments" ? getIncomeRecordsPaginated(effectiveFilters, requestedPage, pageSize) : Promise.resolve({ items: [], totalCount: 0 }),
    tab === "expenses" ? getExpensesPaginated(effectiveFilters, requestedPage, pageSize) : Promise.resolve({ items: [], totalCount: 0 }),
  ]);

  const activeResult = tab === "payments" ? incomePaginated : expensesPaginated;
  const page = clampPage(requestedPage, activeResult.totalCount, pageSize);
  const searchPreserveParams = buildFinanceSearchPreserveParams(effectiveFilters);

  const tabs = [
    { label: "Payments", value: "payments" as TabType },
    { label: "Expenses", value: "expenses" as TabType },
  ];

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary">Transactions</h1>
      <p className="mt-1 text-sm text-muted">
        Manage all recorded payments and expenses.
      </p>

      <ActionToast trigger={params.saved === "1"} paramName="saved" message="Transaction recorded." variant="info" />
      <ActionToast trigger={params.deleted === "1"} paramName="deleted" message="Transaction deleted." variant="info" />
      {params.error && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text" role="alert">
          {decodeURIComponent(params.error)}
        </p>
      )}

      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Transaction type">
        {tabs.map((item) => {
          const active = tab === item.value;
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
            </Link>
          );
        })}
      </nav>

      <div className="mt-6">
        {tab === "payments" ? (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Link
                href="/admin/record-payment"
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light"
              >
                Record New
              </Link>
            </div>

            <ListSearchForm
              action="/admin/transactions"
              query={filters.q}
              placeholder="Search by student, course, or description"
              preserveParams={{ ...searchPreserveParams, tab: "payments" }}
              totalCount={filters.q ? activeResult.totalCount : undefined}
            />

            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <FinanceIncomeTable records={incomePaginated.items} />
            </div>
            
            <Pagination
              basePath="/admin/transactions"
              params={params}
              page={page}
              totalCount={activeResult.totalCount}
              pageSize={pageSize}
            />
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Link
                href="/admin/record-expense"
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light"
              >
                Record New
              </Link>
            </div>

            <ListSearchForm
              action="/admin/transactions"
              query={filters.q}
              placeholder="Search by description, category, or teacher"
              preserveParams={{ ...searchPreserveParams, tab: "expenses" }}
              totalCount={filters.q ? activeResult.totalCount : undefined}
            />

            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <FinanceExpenseTable expenses={expensesPaginated.items} returnQuery={params} />
            </div>

            <Pagination
              basePath="/admin/transactions"
              params={params}
              page={page}
              totalCount={activeResult.totalCount}
              pageSize={pageSize}
            />
          </section>
        )}
      </div>
    </div>
  );
}
