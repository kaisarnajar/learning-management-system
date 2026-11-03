import { Suspense, type ReactNode } from "react";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { clampPage, parsePaginationParams } from "@/utils/pagination";

type PageParams = Record<string, string | undefined>;

type AdminListPageProps<TResult extends { totalCount: number }> = {
  /** Path of the list page; used as the search form action and the pagination base. */
  basePath: string;
  params: PageParams;
  q?: string;
  searchPlaceholder: string;
  /** Message when the list is empty and no search is active. */
  emptyText: string;
  /** Message when a search matched nothing. */
  noMatchText: string;
  /** Vertical padding of the empty message (`py-8` or `py-10`). */
  emptyPaddingClassName?: string;
  /** Fetches one page; runs inside Suspense so the page chrome renders immediately. */
  load: (page: number, pageSize: number) => Promise<TResult>;
  /** Renders the table for a non-empty result. */
  children: (result: NoInfer<TResult>) => ReactNode;
  /** Rendered above the search form (needs the total count). Declare `load` before it so `TResult` is inferred from `load`. */
  header?: (result: NoInfer<TResult>) => ReactNode;
  /** Extra controls beside the search form. */
  toolbar?: ReactNode;
  /** Query params the search form carries over (e.g. the active filter or sort). */
  preserveParams?: PageParams;
  /** Replaces the default search-box + table skeleton. */
  skeleton?: ReactNode;
};

async function AdminListBody<TResult extends { totalCount: number }>({
  basePath,
  params,
  q,
  searchPlaceholder,
  emptyText,
  noMatchText,
  emptyPaddingClassName = "py-8",
  load,
  children,
  header,
  toolbar,
  preserveParams,
}: Omit<AdminListPageProps<TResult>, "skeleton">) {
  const { page: requestedPage, pageSize } = parsePaginationParams(params);
  const result = await load(requestedPage, pageSize);
  const { totalCount } = result;
  const page = clampPage(requestedPage, totalCount, pageSize);

  const searchForm = (
    <ListSearchForm
      action={basePath}
      query={q}
      placeholder={searchPlaceholder}
      preserveParams={preserveParams}
      totalCount={q ? totalCount : undefined}
    />
  );

  return (
    <>
      {header?.(result)}

      {toolbar ? (
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {searchForm}
          {toolbar}
        </div>
      ) : (
        <div className="mt-6">{searchForm}</div>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
        {totalCount === 0 ? (
          <p className={`px-4 ${emptyPaddingClassName} text-center text-sm text-muted`}>
            {q ? noMatchText : emptyText}
          </p>
        ) : (
          children(result)
        )}
      </div>

      <Pagination
        basePath={basePath}
        params={params}
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </>
  );
}

/** Shared shell of the admin list pages: Suspense + skeleton, search, empty state, table and pagination. */
export function AdminListPage<TResult extends { totalCount: number }>({
  skeleton,
  ...props
}: AdminListPageProps<TResult>) {
  return (
    <Suspense fallback={skeleton ?? <TableSkeleton />}>
      <AdminListBody {...props} />
    </Suspense>
  );
}
