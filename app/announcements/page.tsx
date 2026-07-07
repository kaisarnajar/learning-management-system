import type { Metadata } from "next";
import { BRAND_CONFIG } from "@/config/brand";
import { SiteAnnouncementCard } from "@/components/announcements/SiteAnnouncementCard";
import { Pagination } from "@/components/shared/Pagination";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { GRID_PAGE_SIZE, clampPage, parsePaginationParams } from "@/utils/pagination";
import { parseSearchQuery } from "@/utils/text-search";
import { getPublishedSiteAnnouncementsPaginated } from "@/services/site-announcements";
import { Source_Serif_4 } from "next/font/google";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["600", "700"] });

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
      <section className="relative overflow-hidden bg-gradient-to-br from-[#003527] via-teal-900 to-[#002117] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="pattern-islamic absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" />
        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-[#cca72f]/0 via-[#cca72f] to-[#cca72f]/0 opacity-50"></div>
        <div className="mx-auto max-w-4xl text-center">
          <div className="motion-safe:animate-fade-up">
            <h1 className={`${sourceSerif.className} text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl`}>
              Announcements
            </h1>
            <div className="mx-auto mt-6 h-1 w-24 rounded-full bg-brand-gold-alt"></div>
            <p className="mt-8 text-lg leading-relaxed text-white/90 sm:text-xl">
              Stay updated with the latest events, programs, and notices from the academy.
            </p>
          </div>
        </div>
      </section>

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
