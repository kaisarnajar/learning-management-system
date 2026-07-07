import Link from "next/link";
import { buildPageHref, getTotalPages } from "@/utils/pagination";

type PaginationProps = {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  totalCount: number;
  pageSize: number;
  pageParam?: string;
};

function getPageNumbers(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);
  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < totalPages) pages.add(currentPage + 1);
  if (currentPage > 2) pages.add(currentPage - 2);
  if (currentPage < totalPages - 1) pages.add(currentPage + 2);

  return [...pages].sort((a, b) => a - b);
}

export function Pagination({
  basePath,
  params,
  page,
  totalCount,
  pageSize,
  pageParam = "page",
}: PaginationProps) {
  const totalPages = getTotalPages(totalCount, pageSize);

  if (totalPages <= 1) return null;

  const prevHref =
    page > 1 ? buildPageHref(basePath, params, page - 1, { pageParam }) : null;
  const nextHref =
    page < totalPages ? buildPageHref(basePath, params, page + 1, { pageParam }) : null;

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <nav
      className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Pagination"
    >
      <p className="text-sm text-muted">
        Page {page} of {totalPages} · {totalCount} {totalCount === 1 ? "item" : "items"}
      </p>

      <div className="flex flex-wrap items-center gap-1">
        {prevHref ? (
          <Link
            href={prevHref}
            className="inline-flex min-h-9 items-center rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-background/80"
          >
            Previous
          </Link>
        ) : (
          <span
            className="inline-flex min-h-9 cursor-not-allowed items-center rounded-md border border-border bg-background/50 px-3 py-1.5 text-sm font-medium text-muted"
            aria-disabled="true"
          >
            Previous
          </span>
        )}

        <div className="hidden items-center gap-1 sm:flex">
          {pageNumbers.map((pageNum, index) => {
            const prevNum = pageNumbers[index - 1];
            const showEllipsis = prevNum !== undefined && pageNum - prevNum > 1;

            return (
              <span key={pageNum} className="flex items-center gap-1">
                {showEllipsis && <span className="px-1 text-muted">…</span>}
                {pageNum === page ? (
                  <span
                    className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md bg-primary px-2 py-1.5 text-sm font-semibold text-white"
                    aria-current="page"
                  >
                    {pageNum}
                  </span>
                ) : (
                  <Link
                    href={buildPageHref(basePath, params, pageNum, { pageParam })}
                    className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-border bg-surface px-2 py-1.5 text-sm font-medium text-foreground hover:bg-background/80"
                  >
                    {pageNum}
                  </Link>
                )}
              </span>
            );
          })}
        </div>

        {nextHref ? (
          <Link
            href={nextHref}
            className="inline-flex min-h-9 items-center rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-background/80"
          >
            Next
          </Link>
        ) : (
          <span
            className="inline-flex min-h-9 cursor-not-allowed items-center rounded-md border border-border bg-background/50 px-3 py-1.5 text-sm font-medium text-muted"
            aria-disabled="true"
          >
            Next
          </span>
        )}
      </div>
    </nav>
  );
}
