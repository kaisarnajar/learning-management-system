import type { Metadata } from "next";
import Link from "next/link";
import { PendingBookOrdersTable } from "@/components/admin/PendingBookOrdersTable";
import { Pagination } from "@/components/shared/Pagination";
import { getPendingBookOrdersPaginated } from "@/lib/bookstore";
import { APPROVAL_PAGE_SIZE, clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";

export const metadata: Metadata = {
  title: "Book Orders — Admin",
  description: "Review and approve or decline book purchase orders submitted by students.",
};

export default async function AdminBookOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmed?: string; declined?: string; page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const q = parseSearchQuery(params.q);
  const { page: requestedPage, pageSize } = parsePaginationParams(params, {
    pageSize: APPROVAL_PAGE_SIZE,
  });

  const { items: orders, totalCount } = await getPendingBookOrdersPaginated(
    requestedPage,
    pageSize,
    q,
  );

  const page = clampPage(requestedPage, totalCount, pageSize);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">
            Book Orders
            {totalCount > 0 && (
              <span className="ml-3 inline-flex rounded-full bg-amber-100 px-3 py-0.5 text-sm font-semibold text-amber-900">
                {totalCount}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Pending book purchase orders awaiting payment verification.
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

      <div className="mt-8 overflow-x-auto rounded-lg border border-border bg-surface">
        <PendingBookOrdersTable
          orders={orders}
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
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </div>
  );
}
