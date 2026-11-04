import Link from "next/link";
import { AdminListPage } from "@/components/shared/AdminListPage";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { deleteSiteAnnouncement } from "@/app/admin/announcements/actions";
import { ToggleHomepageAnnouncementButton } from "@/components/admin/ToggleHomepageAnnouncementButton";
import {
  getAllSiteAnnouncementsForAdminPaginated,
  HOMEPAGE_FEATURED_ANNOUNCEMENTS_MAX,
} from "@/services/site-announcements";
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

function statusBadge(published: boolean, showOnHomepage: boolean) {
  if (!published) return { label: "Draft", className: "bg-surface-muted-hover text-muted" };
  if (showOnHomepage) return { label: "Home + Public", className: "bg-info-bg text-info-text" };
  return { label: "Published", className: "bg-success-bg text-success-text" };
}

import { adminActionButtonClassName } from "@/utils/form";
import { requireAdmin } from "@/services/auth-actions";

export default async function AdminAnnouncementsPage({
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
          <h1 className="font-serif text-2xl font-bold text-primary">Announcements</h1>
          <p className="mt-1 text-sm text-muted">
            Academy-wide news — events, scholar visits, masjid programs, and more. Up to{" "}
            {HOMEPAGE_FEATURED_ANNOUNCEMENTS_MAX} published items can be featured on the homepage; all
            published items appear on the public Announcements page.
          </p>
        </div>
        <Link
          href="/admin/announcements/new"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-light"
        >
          New announcement
        </Link>
      </div>

      <ActionToast trigger={params.posted === "1"} paramName="posted" message="Announcement created." variant="info" />
      <ActionToast trigger={params.saved === "1"} paramName="saved" message="Announcement updated." variant="info" />
      <ActionToast trigger={params.deleted === "1"} paramName="deleted" message="Announcement deleted." variant="info" />
      {params.error === "notfound" && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text">Announcement not found.</p>
      )}
      {params.error && params.error !== "notfound" && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text">
          {decodeURIComponent(params.error)}
        </p>
      )}

      <AdminListPage
        basePath="/admin/announcements"
        params={params}
        q={q}
        searchPlaceholder="Search by title, location, or body"
        emptyText="No announcements yet."
        noMatchText="No announcements match your search."
        emptyPaddingClassName="py-10"
        load={(page, pageSize) => getAllSiteAnnouncementsForAdminPaginated(page, pageSize, q)}
      >
        {({ items: announcements }) => (
          <table className="w-full min-w-ui-800 text-left text-sm">
            <thead className="border-b border-border bg-background/50 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">When / Where</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Homepage</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {announcements.map((item) => {
                const badge = statusBadge(item.published, item.showOnHomepage);
                return (
                  <tr key={item.id} className="hover:bg-background/30">
                    <td className="px-4 py-3 font-medium text-foreground">{item.title}</td>
                    <td className="px-4 py-3 text-muted">
                      {item.eventDate && <p>{item.eventDate}</p>}
                      {item.location && <p className="text-xs">{item.location}</p>}
                      {!item.eventDate && !item.location && "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ToggleHomepageAnnouncementButton
                        id={item.id}
                        showOnHomepage={item.showOnHomepage}
                        published={item.published}
                      />
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {item.createdAt.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <Link
                          href={`/announcements/${item.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={adminActionButtonClassName}
                        >
                          View
                        </Link>
                        <Link
                          href={`/admin/announcements/${item.id}/edit`}
                          className={adminActionButtonClassName}
                        >
                          Edit
                        </Link>
                        <DeleteActionButton action={deleteSiteAnnouncement.bind(null, item.id)} itemName={item.title} />
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

