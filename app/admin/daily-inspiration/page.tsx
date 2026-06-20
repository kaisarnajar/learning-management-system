import Link from "next/link";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { deleteDailyInspiration } from "@/app/admin/daily-inspiration/actions";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import {
  dailyInspirationKindLabel,
  getAllDailyInspirationsForAdminPaginated,
  getHomepageDailyInspirationId,
} from "@/lib/daily-inspiration";
import { clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";

export default async function AdminDailyInspirationPage({
  searchParams,
}: {
  searchParams: Promise<{ posted?: string; saved?: string; deleted?: string; error?: string; page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const q = parseSearchQuery(params.q);
  const { page: requestedPage, pageSize } = parsePaginationParams(params);
  const [{ items, totalCount }, homepageId] = await Promise.all([
    getAllDailyInspirationsForAdminPaginated(requestedPage, pageSize, q),
    getHomepageDailyInspirationId(),
  ]);
  const page = clampPage(requestedPage, totalCount, pageSize);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">Verse &amp; Hadith of the Day</h1>
          <p className="mt-1 text-sm text-muted">
            Post a Quranic verse or Hadith for the homepage. The latest published entry is shown.
          </p>
        </div>
        <Link
          href="/admin/daily-inspiration/new"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-light"
        >
          New post
        </Link>
      </div>

      {params.posted === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">Entry created.</p>
      )}
      {params.saved === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">Entry updated.</p>
      )}
      {params.deleted === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">Entry deleted.</p>
      )}
      {params.error === "notfound" && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text">Entry not found.</p>
      )}

      <div className="mt-6">
        <ListSearchForm
          action="/admin/daily-inspiration"
          query={q}
          placeholder="Search by Arabic text, translation, or reference"
          totalCount={q ? totalCount : undefined}
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
        {totalCount === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            {q ? "No entries match your search." : "No verses or hadith posted yet."}
          </p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-background/50 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Arabic (preview)</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => {
                const onHomepage = item.published && item.id === homepageId;
                const preview =
                  item.arabicText.length > 60
                    ? `${item.arabicText.slice(0, 60)}…`
                    : item.arabicText;

                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {dailyInspirationKindLabel(item.kind)}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-muted indo-pak-arabic" dir="rtl">
                      {preview}
                    </td>
                    <td className="px-4 py-3">
                      {!item.published ? (
                        <span className="rounded-full bg-surface-muted-hover px-2.5 py-0.5 text-xs font-medium text-muted">
                          Draft
                        </span>
                      ) : onHomepage ? (
                        <span className="rounded-full bg-info-bg px-2.5 py-0.5 text-xs font-medium text-info-text">
                          On homepage
                        </span>
                      ) : (
                        <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-medium text-success-text">
                          Published
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {item.updatedAt.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <Link
                          href={`/admin/daily-inspiration/${item.id}/edit`}
                          className="font-medium text-primary hover:underline"
                        >
                          Edit
                        </Link>
                        <DeleteActionButton action={deleteDailyInspiration.bind(null, item.id)} itemName={item.kind} className="text-sm font-medium text-destructive-text hover:underline" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        basePath="/admin/daily-inspiration"
        params={params}
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </div>
  );
}
