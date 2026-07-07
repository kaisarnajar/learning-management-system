import Link from "next/link";
import Image from "next/image";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { deleteLibraryItemAction } from "@/app/admin/library/actions";
import { adminActionButtonClassName } from "@/lib/form";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { getAllLibraryItemsPaginated } from "@/lib/library";
import { clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";
import { ActionToast } from "@/components/shared/ToastProvider";


import { Suspense } from "react";

type PageParams = {

  deleted?: string;
  created?: string;
  saved?: string;
  page?: string;
  q?: string;
  [key: string]: string | undefined;
};

async function AdminLibraryList({ params, q }: { params: PageParams; q?: string }) {
  const { page: requestedPage, pageSize } = parsePaginationParams(params);
  const { items, totalCount } = await getAllLibraryItemsPaginated(requestedPage, pageSize, q);
  const page = clampPage(requestedPage, totalCount, pageSize);

  return (
    <>
      <div className="mt-6">
        <ListSearchForm
          action="/admin/library"
          query={q}
          placeholder="Search by title, author, or topic"
          totalCount={q ? totalCount : undefined}
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
        {totalCount === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">
            {q ? "No library items match your search." : "No library items yet."}
          </p>
        ) : (
          <table className="w-full min-w-ui-720 text-left text-sm">
            <thead className="border-b border-border bg-background/50 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Homepage</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-9 shrink-0 overflow-hidden rounded border border-border">
                        {item.imagePath ? (
                          <Image
                            src={item.imagePath}
                            alt={item.title}
                            width={36}
                            height={48}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-accent-muted/30">
                            <svg className="h-4 w-4 text-muted/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted">{item.author} · {item.topic}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge published={item.published} />
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {item.featuredOnHomepage && item.published ? "Featured" : "Not featured"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Link
                        href={`/admin/library/${item.id}`}
                        className={adminActionButtonClassName}
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/library/${item.id}/edit`}
                        className={adminActionButtonClassName}
                      >
                        Edit
                      </Link>
                      <DeleteActionButton action={deleteLibraryItemAction.bind(null, item.id, "list")} itemName={item.title} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        basePath="/admin/library"
        params={params}
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </>
  );
}

function TableSkeleton() {
  return (
    <>
      <div className="mt-6 h-10 w-full max-w-sm rounded-md bg-border/40 animate-pulse" />
      <div className="mt-4 h-ui-400 w-full rounded-lg bg-border/40 animate-pulse" />
    </>
  );
}

export default async function AdminLibraryPage({
  searchParams,
}: {
  searchParams: Promise<PageParams>;
}) {
  const params = await searchParams;
  const q = parseSearchQuery(params.q);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">Library</h1>
        </div>
        <Link
          href="/admin/library/new"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light"
        >
          Add item
        </Link>
      </div>

      <ActionToast trigger={params.created === "1"} paramName="created" message="Item created." variant="info" />
      <ActionToast trigger={params.deleted === "1"} paramName="deleted" message="Item deleted." variant="info" />
      <ActionToast trigger={params.saved === "1"} paramName="saved" message="Changes saved." variant="info" />

      <Suspense fallback={<TableSkeleton />}>
        <AdminLibraryList params={params} q={q} />
      </Suspense>
    </div>
  );
}

