import { FinanceDateFilter } from "@/components/admin/FinanceDateFilter";
import { FinanceTabs } from "@/components/admin/FinanceTabs";
import { BookstoreFinanceSummaryCards } from "@/components/admin/BookstoreFinanceSummaryCards";
import { BookstoreSalesTable } from "@/components/admin/BookstoreSalesTable";
import { BookstoreOrdersTable } from "@/components/admin/BookstoreOrdersTable";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import {
  parseFinanceFilters,
  type FinanceSearchParams,
} from "@/lib/finance-filters";
import {
  getBookstoreFinanceSummary,
  getBookSalesPaginated,
  getBookOrderFinancePaginated,
} from "@/lib/finance-bookstore";
import { clampPage, parsePaginationParams } from "@/lib/pagination";
import Link from "next/link";

export default async function AdminBookstoreFinancePage({
  searchParams,
}: {
  searchParams: Promise<FinanceSearchParams & { view?: string }>;
}) {
  const params = await searchParams;
  const filters = parseFinanceFilters(params);
  const { page: requestedPage, pageSize } = parsePaginationParams(params);
  const view = params.view === "orders" ? "orders" : "sales";

  const dateOnlyFilters = {
    preset: filters.preset,
    from: filters.from,
    to: filters.to,
    tab: filters.tab,
  };

  const summary = await getBookstoreFinanceSummary(dateOnlyFilters);

  const searchPreserveParams: Record<string, string> = {};
  if (filters.preset !== "this_month") searchPreserveParams.preset = filters.preset;
  if (filters.from) searchPreserveParams.from = filters.from.toISOString().slice(0, 10);
  if (filters.to) searchPreserveParams.to = filters.to.toISOString().slice(0, 10);
  if (view === "orders") searchPreserveParams.view = "orders";

  let salesData = null;
  let ordersData = null;
  let page = 1;
  let totalCount = 0;

  if (view === "sales") {
    salesData = await getBookSalesPaginated(requestedPage, pageSize, filters.q);
    totalCount = salesData.totalCount;
    page = clampPage(requestedPage, totalCount, pageSize);
  } else {
    ordersData = await getBookOrderFinancePaginated(filters, requestedPage, pageSize);
    totalCount = ordersData.totalCount;
    page = clampPage(requestedPage, totalCount, pageSize);
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary">Finance</h1>
      <p className="mt-1 text-sm text-muted">
        Track Book Store performance, inventory costs, and revenue.
      </p>

      <div className="mt-6">
        <FinanceDateFilter filters={filters} />
      </div>

      <div className="mt-6">
        <BookstoreFinanceSummaryCards summary={summary} />
      </div>

      <div className="mt-8">
        <FinanceTabs filters={filters} />
      </div>
      
      <div className="mt-6">
        <nav className="flex gap-4 border-b border-border mb-6">
          <Link
            href={`/admin/finance/bookstore?${new URLSearchParams({ ...searchPreserveParams, view: "sales" }).toString()}`}
            className={`pb-2 text-sm font-medium border-b-2 ${view === "sales" ? "border-primary text-primary" : "border-transparent text-muted hover:border-border hover:text-foreground"}`}
          >
            Book Sales Report
          </Link>
          <Link
            href={`/admin/finance/bookstore?${new URLSearchParams({ ...searchPreserveParams, view: "orders" }).toString()}`}
            className={`pb-2 text-sm font-medium border-b-2 ${view === "orders" ? "border-primary text-primary" : "border-transparent text-muted hover:border-border hover:text-foreground"}`}
          >
            Order Finance Report
          </Link>
        </nav>

        {view === "sales" ? (
          <section className="space-y-4">
            <ListSearchForm
              action="/admin/finance/bookstore"
              query={filters.q}
              placeholder="Search by book title or author"
              preserveParams={searchPreserveParams}
              totalCount={filters.q ? totalCount : undefined}
            />

            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <BookstoreSalesTable records={salesData!.items} />
            </div>

            <Pagination
              basePath="/admin/finance/bookstore"
              params={{ ...params, view: "sales" }}
              page={page}
              totalCount={totalCount}
              pageSize={pageSize}
            />
          </section>
        ) : (
          <section className="space-y-4">
            <ListSearchForm
              action="/admin/finance/bookstore"
              query={filters.q}
              placeholder="Search by order ID, customer name, or email"
              preserveParams={searchPreserveParams}
              totalCount={filters.q ? totalCount : undefined}
            />

            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <BookstoreOrdersTable records={ordersData!.items} />
            </div>

            <Pagination
              basePath="/admin/finance/bookstore"
              params={{ ...params, view: "orders" }}
              page={page}
              totalCount={totalCount}
              pageSize={pageSize}
            />
          </section>
        )}
      </div>
    </div>
  );
}
