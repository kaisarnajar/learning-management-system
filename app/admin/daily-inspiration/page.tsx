import Link from "next/link";
import { AdminListPage } from "@/components/shared/AdminListPage";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { deleteDailyInspiration } from "@/app/admin/daily-inspiration/actions";
import {
  dailyInspirationKindLabel,
  getAllDailyInspirationsForAdminPaginated,
  getHomepageDailyInspirationId,
} from "@/services/daily-inspiration";
import { parseSearchQuery } from "@/utils/text-search";
import { ActionToast } from "@/components/shared/ToastProvider";



type PageParams = {

  posted?: string;
  saved?: string;
  deleted?: string;
  error?: string;
  page?: string;
  q?: string;
  [key: string]: string | undefined;
};

import { adminActionButtonClassName } from "@/utils/form";
import { requireAdmin } from "@/services/auth-actions";

export default async function AdminDailyInspirationPage({
  searchParams,
}: {
  searchParams: Promise<PageParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = parseSearchQuery(params.q);

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

      <ActionToast trigger={params.posted === "1"} paramName="posted" message="Entry created." variant="info" />
      <ActionToast trigger={params.saved === "1"} paramName="saved" message="Entry updated." variant="info" />
      <ActionToast trigger={params.deleted === "1"} paramName="deleted" message="Entry deleted." variant="info" />
      {params.error === "notfound" && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text">Entry not found.</p>
      )}

      <AdminListPage
        basePath="/admin/daily-inspiration"
        params={params}
        q={q}
        searchPlaceholder="Search by Arabic text, translation, or reference"
        emptyText="No verses or hadith posted yet."
        noMatchText="No entries match your search."
        emptyPaddingClassName="py-10"
        load={async (page, pageSize) => {
          const [{ items, totalCount }, homepageId] = await Promise.all([
            getAllDailyInspirationsForAdminPaginated(page, pageSize, q),
            getHomepageDailyInspirationId(),
          ]);
          return { items, totalCount, homepageId };
        }}
      >
        {({ items, homepageId }) => (
          <table className="w-full min-w-ui-720 text-left text-sm">
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
                          href={`/admin/daily-inspiration/${item.id}`}
                          className={adminActionButtonClassName}
                        >
                          View
                        </Link>
                        <Link
                          href={`/admin/daily-inspiration/${item.id}/edit`}
                          className={adminActionButtonClassName}
                        >
                          Edit
                        </Link>
                        <DeleteActionButton action={deleteDailyInspiration.bind(null, item.id)} itemName={item.kind} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </AdminListPage>
    </div>
  );
}

