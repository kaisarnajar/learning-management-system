import type { Metadata } from "next";
import Link from "next/link";
import { ApprovedBookOrdersTable } from "@/components/admin/ApprovedBookOrdersTable";
import { CompletedBookOrdersTable } from "@/components/admin/CompletedBookOrdersTable";
import { PendingBookOrdersTable } from "@/components/admin/PendingBookOrdersTable";
import { Pagination } from "@/components/shared/Pagination";
import {
  getPendingBookOrdersPaginated,
  getApprovedBookOrdersPaginated,
  getCompletedBookOrdersPaginated,
} from "@/lib/bookstore";
import { APPROVAL_PAGE_SIZE, clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";

export const metadata: Metadata = {
  title: "Book Orders — Admin",
  description: "Review and approve or decline book purchase orders submitted by students.",
};

function tabHref(status: "pending" | "approved" | "completed", q?: string) {
  const params = new URLSearchParams();
  if (status !== "pending") params.set("status", status);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/admin/bookstore/orders?${qs}` : "/admin/bookstore/orders";
}

export default async function AdminBookOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    confirmed?: string;
    declined?: string;
    shipped?: string;
    refunded?: string;
    page?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const q = parseSearchQuery(params.q);
  const status =
    params.status === "approved" || params.status === "completed"
      ? params.status
      : "pending";

  const { page: requestedPage, pageSize } = parsePaginationParams(params, {
    pageSize: APPROVAL_PAGE_SIZE,
  });

  // We only fetch the active tab's items to optimize performance,
  // but we should fetch counts for all three if we want to show badges on tabs.
  const [pendingResult, approvedResult, completedResult] = await Promise.all([
    getPendingBookOrdersPaginated(status === "pending" ? requestedPage : 1, pageSize, q),
    getApprovedBookOrdersPaginated(status === "approved" ? requestedPage : 1, pageSize, q),
    getCompletedBookOrdersPaginated(status === "completed" ? requestedPage : 1, pageSize, q),
  ]);

  const pendingCount = pendingResult.totalCount;
  const approvedCount = approvedResult.totalCount;
  const completedCount = completedResult.totalCount;

  const activeResult = 
    status === "pending" ? pendingResult 
    : status === "approved" ? approvedResult 
    : completedResult;
  
  const safePage = clampPage(requestedPage, activeResult.totalCount, pageSize);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">
            Book Orders
          </h1>
          <p className="mt-1 text-sm text-muted">
            Manage pending book purchase orders and fulfill approved orders.
          </p>
        </div>
        <Link
          href="/admin/bookstore"
          className="shrink-0 text-sm font-medium text-primary hover:underline"
        >
          ← Manage Books
        </Link>
      </div>

      {params.confirmed === "1" && (
        <p className="mt-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Order approved. The student has been notified.
        </p>
      )}
      {params.declined === "1" && (
        <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Order declined. The student has been notified.
        </p>
      )}
      {params.shipped === "1" && (
        <p className="mt-4 rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Order marked as shipped. The student has been notified.
        </p>
      )}
      {params.refunded === "1" && (
        <p className="mt-4 rounded-md bg-gray-100 px-4 py-3 text-sm text-gray-800">
          Order refunded. The student has been notified.
        </p>
      )}

      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Order status">
        {(
          [
            { label: "Pending Approvals", value: "pending" as const, count: pendingCount },
            { label: "Approved Orders", value: "approved" as const, count: approvedCount },
            { label: "Completed Orders", value: "completed" as const, count: completedCount },
          ] as const
        ).map((item) => {
          const active = status === item.value;
          const href = tabHref(item.value, q);
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
              {item.count > 0 && (
                <span
                  className={`ml-2 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    active ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {status === "pending" && (
        <section id="pending-orders" className="mt-6">
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <PendingBookOrdersTable
              orders={pendingResult.items}
              emptyMessage={
                q
                  ? "No pending orders match your search."
                  : "No book orders awaiting verification."
              }
            />
          </div>
          <Pagination
            basePath="/admin/bookstore/orders"
            params={params}
            page={safePage}
            totalCount={pendingCount}
            pageSize={pageSize}
          />
        </section>
      )}

      {status === "approved" && (
        <section id="approved-orders" className="mt-6">
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <ApprovedBookOrdersTable
              orders={approvedResult.items}
              emptyMessage={
                q
                  ? "No approved orders match your search."
                  : "No approved orders awaiting fulfillment."
              }
            />
          </div>
          <Pagination
            basePath="/admin/bookstore/orders"
            params={params}
            page={safePage}
            totalCount={approvedCount}
            pageSize={pageSize}
          />
        </section>
      )}

      {status === "completed" && (
        <section id="completed-orders" className="mt-6">
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <CompletedBookOrdersTable
              orders={completedResult.items}
              emptyMessage={
                q
                  ? "No completed orders match your search."
                  : "No completed orders found."
              }
            />
          </div>
          <Pagination
            basePath="/admin/bookstore/orders"
            params={params}
            page={safePage}
            totalCount={completedCount}
            pageSize={pageSize}
          />
        </section>
      )}
    </div>
  );
}
