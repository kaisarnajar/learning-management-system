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

export default async function AdminBookOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    confirmed?: string;
    declined?: string;
    shipped?: string;
    refunded?: string;
    page?: string;
    approvedPage?: string;
    completedPage?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const q = parseSearchQuery(params.q);

  const { page: pendingPage, pageSize: pendingPageSize } = parsePaginationParams(params, {
    pageSize: APPROVAL_PAGE_SIZE,
  });

  const { page: approvedPage, pageSize: approvedPageSize } = parsePaginationParams(params, {
    pageSize: APPROVAL_PAGE_SIZE,
    pageParam: "approvedPage",
  });

  const { page: completedPage, pageSize: completedPageSize } = parsePaginationParams(params, {
    pageSize: APPROVAL_PAGE_SIZE,
    pageParam: "completedPage",
  });

  const [pendingResult, approvedResult, completedResult] = await Promise.all([
    getPendingBookOrdersPaginated(pendingPage, pendingPageSize, q),
    getApprovedBookOrdersPaginated(approvedPage, approvedPageSize, q),
    getCompletedBookOrdersPaginated(completedPage, completedPageSize, q),
  ]);

  const { items: pendingOrders, totalCount: pendingCount } = pendingResult;
  const { items: approvedOrders, totalCount: approvedCount } = approvedResult;
  const { items: completedOrders, totalCount: completedCount } = completedResult;

  const safePendingPage = clampPage(pendingPage, pendingCount, pendingPageSize);
  const safeApprovedPage = clampPage(approvedPage, approvedCount, approvedPageSize);
  const safeCompletedPage = clampPage(completedPage, completedCount, completedPageSize);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
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

      <section id="pending-orders" className="mt-8 scroll-mt-6">
        <h2 className="font-serif text-lg font-semibold text-foreground">
          Pending approvals
          {pendingCount > 0 && (
            <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
              {pendingCount}
            </span>
          )}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Review payment details and approve or decline pending orders.
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
          <PendingBookOrdersTable
            orders={pendingOrders}
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
          page={safePendingPage}
          totalCount={pendingCount}
          pageSize={pendingPageSize}
        />
      </section>

      <section id="approved-orders" className="mt-10 scroll-mt-6">
        <h2 className="font-serif text-lg font-semibold text-foreground">
          Approved Orders
          {approvedCount > 0 && (
            <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
              {approvedCount}
            </span>
          )}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Mark approved orders as shipped once dispatched, or refund if necessary.
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
          <ApprovedBookOrdersTable
            orders={approvedOrders}
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
          page={safeApprovedPage}
          totalCount={approvedCount}
          pageSize={approvedPageSize}
          pageParam="approvedPage"
        />
      </section>

      <section id="completed-orders" className="mt-10 scroll-mt-6">
        <h2 className="font-serif text-lg font-semibold text-foreground">
          Completed Orders
          {completedCount > 0 && (
            <span className="ml-2 inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800">
              {completedCount}
            </span>
          )}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Historical record of all shipped, refunded, and declined book orders.
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
          <CompletedBookOrdersTable
            orders={completedOrders}
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
          page={safeCompletedPage}
          totalCount={completedCount}
          pageSize={completedPageSize}
          pageParam="completedPage"
        />
      </section>
    </div>
  );
}
