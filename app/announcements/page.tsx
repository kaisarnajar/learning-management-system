import type { Metadata } from "next";
import { SiteAnnouncementCard } from "@/components/announcements/SiteAnnouncementCard";
import { PageHeader } from "@/components/site/PageHeader";
import { Section } from "@/components/site/Section";
import { Pagination } from "@/components/shared/Pagination";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { GRID_PAGE_SIZE, clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";
import { getPublishedSiteAnnouncementsPaginated } from "@/lib/site-announcements";

export const metadata: Metadata = {
  title: "Announcements",
  description:
    "Events, scholar visits, and academy updates from Darse Quran Academy — masjid programs, special sessions, and more.",
};

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const { page: requestedPage, pageSize } = parsePaginationParams(params, {
    pageSize: GRID_PAGE_SIZE,
  });
  const q = parseSearchQuery(params.q);
  const { items: announcements, totalCount } = await getPublishedSiteAnnouncementsPaginated(
    requestedPage,
    pageSize,
    q,
  );
  const page = clampPage(requestedPage, totalCount, pageSize);

  return (
    <Section>
      <PageHeader
        title="Announcements"
        description="Stay updated with the latest events, programs, and notices from the academy."
      />

      <div className="mt-6 mb-8 max-w-md">
        <ListSearchForm action="/announcements" query={q} placeholder="Search announcements..." />
      </div>

      {totalCount === 0 ? (
        <p className="mt-12 rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center text-muted">
          No announcements at the moment. Please check again soon.
        </p>
      ) : (
        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {announcements.map((announcement) => (
            <li key={announcement.id}>
              <SiteAnnouncementCard announcement={announcement} />
            </li>
          ))}
        </ul>
      )}

      <Pagination
        basePath="/announcements"
        params={params}
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </Section>
  );
}
