import { Metadata } from "next";
import { getGeneratedReceiptsPaginated } from "@/services/receipts-admin";
import { AdminReceiptsTable } from "@/components/admin/receipts/AdminReceiptsTable";
import { Pagination } from "@/components/shared/Pagination";
import { ListSearchForm } from "@/components/shared/ListSearchForm";

export const metadata: Metadata = {
  title: "Payment Receipts | Admin",
  description: "Manage generated payment receipts.",
};

export default async function AdminReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page, q } = await searchParams;
  const safePage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const pageSize = 20;

  const result = await getGeneratedReceiptsPaginated(safePage, pageSize, q);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payment Receipts</h1>
          <p className="mt-1 text-sm text-muted">
            View and search all generated payment receipts.
          </p>
        </div>
      </header>

      <div className="mt-6 mb-2">
        <ListSearchForm
          action="/admin/receipts"
          query={q}
          totalCount={result.totalCount}
          placeholder="Search by receipt number, name, payment type, or course..."
        />
      </div>

      <section className="mt-6">
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <AdminReceiptsTable
            receipts={result.items}
            emptyMessage={
              q
                ? "No receipts match your search."
                : "No receipts have been generated yet."
            }
          />
        </div>
        <Pagination
          basePath="/admin/receipts"
          params={await searchParams}
          page={safePage}
          totalCount={result.totalCount}
          pageSize={pageSize}
        />
      </section>
    </div>
  );
}
