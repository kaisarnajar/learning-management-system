import { Metadata } from "next";
import { getGeneratedCertificatesPaginated } from "@/lib/certificates-admin";
import { AdminCertificatesTable } from "@/components/admin/certificates/AdminCertificatesTable";
import { Pagination } from "@/components/shared/Pagination";
import { ListSearchForm } from "@/components/shared/ListSearchForm";

export const metadata: Metadata = {
  title: "Certificates Management | Admin",
  description: "Manage generated course certificates.",
};

export default async function AdminCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page, q } = await searchParams;
  const safePage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const pageSize = 20;

  const result = await getGeneratedCertificatesPaginated(safePage, pageSize, q);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Certificates</h1>
          <p className="mt-1 text-sm text-muted">
            View and search all generated certificates for students.
          </p>
        </div>
      </header>

      <div className="mt-6 mb-2">
        <ListSearchForm
          action="/admin/certificates"
          query={q}
          totalCount={result.totalCount}
          placeholder="Search by certificate number, name, or course..."
        />
      </div>

      <section className="mt-6">
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <AdminCertificatesTable
            certificates={result.items}
            emptyMessage={
              q
                ? "No certificates match your search."
                : "No certificates have been generated yet."
            }
          />
        </div>
        <Pagination
          basePath="/admin/certificates"
          params={await searchParams}
          page={safePage}
          totalCount={result.totalCount}
          pageSize={pageSize}
        />
      </section>
    </div>
  );
}
