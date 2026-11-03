import type { Metadata } from "next";
import { BRAND_CONFIG } from "@/config/brand";
import { SiteAnnouncementCard } from "@/components/announcements/SiteAnnouncementCard";
import { Pagination } from "@/components/shared/Pagination";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { GRID_PAGE_SIZE, clampPage, parsePaginationParams } from "@/utils/pagination";
import { parseSearchQuery } from "@/utils/text-search";
import { getPublishedSiteAnnouncementsPaginated } from "@/services/site-announcements";
import { PageHero } from "@/components/shared/PageHero";

export const metadata: Metadata = {
  title: "Announcements",
  description:
    `Events, scholar visits, and academy updates from ${BRAND_CONFIG.name} — masjid programs, special sessions, and more.`,
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
    <>
      {/* Hero Section */}
      <PageHero title="Announcements" description="Stay updated with the latest events, programs, and notices from the academy." />

      {/* Main Content Area */}
      <section className="bg-surface py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Search Form */}
          <div className="motion-safe:animate-fade-up mx-auto mb-12 max-w-2xl">
            <div className="card-elevated rounded-xl bg-surface p-4 shadow-md sm:p-5">
              <ListSearchForm action="/announcements" query={q} placeholder="Search announcements..." />
            </div>
          </div>

          {totalCount === 0 ? (
            <p className="motion-safe:animate-fade-up mt-12 rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center text-muted">
              No announcements at the moment. Please check again soon.
            </p>
          ) : (
            <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {announcements.map((announcement, index) => {
                const animationDelay = `${(index % GRID_PAGE_SIZE) * 100}ms`;
                return (
                  <li 
                    key={announcement.id}
                    className="motion-safe:animate-fade-up h-full"
                    style={{ animationDelay, animationFillMode: 'both' }}
                  >
                    <SiteAnnouncementCard announcement={announcement} />
                  </li>
                );
              })}
            </ul>
          )}

          {totalCount > 0 && (
            <div className="mt-16 motion-safe:animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
              <Pagination
                basePath="/announcements"
                params={params}
                page={page}
                totalCount={totalCount}
                pageSize={pageSize}
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
