import type { Metadata } from "next";
import { BRAND_CONFIG } from "@/config/brand";
import { LibraryCard } from "@/components/LibraryCard";
import { LibraryCategoryFilter } from "@/components/library/LibraryCategoryFilter";
import { Pagination } from "@/components/shared/Pagination";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { isLibraryTopic } from "@/services/library-options";
import { getPublishedLibraryItemsPaginated } from "@/services/library";
import { GRID_PAGE_SIZE, clampPage, parsePaginationParams } from "@/utils/pagination";
import { parseSearchQuery } from "@/utils/text-search";
import { PageHero } from "@/components/shared/PageHero";

const baseUrl = BRAND_CONFIG.websiteUrl.replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Digital Islamic Library & PDF Resources",
  description: `Access and download authentic Islamic books, study guides, Quranic resources, and scholarly texts in the ${BRAND_CONFIG.name} digital library.`,
  alternates: {
    canonical: `${baseUrl}/library`,
  },
  openGraph: {
    title: `Digital Islamic Library | ${BRAND_CONFIG.name}`,
    description: `Access and download authentic Islamic books, study guides, Quranic resources, and scholarly texts in the ${BRAND_CONFIG.name} digital library.`,
    url: `${baseUrl}/library`,
    siteName: BRAND_CONFIG.name,
    type: "website",
    images: [
      {
        url: BRAND_CONFIG.seo.openGraphImage,
        alt: `Digital Library - ${BRAND_CONFIG.name}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Digital Islamic Library | ${BRAND_CONFIG.name}`,
    description: `Access and download authentic Islamic books and study resources in the ${BRAND_CONFIG.name} digital library.`,
    images: [BRAND_CONFIG.seo.openGraphImage],
  },
};

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const category =
    params.category && isLibraryTopic(params.category) ? params.category : undefined;
  const { page: requestedPage, pageSize } = parsePaginationParams(params, {
    pageSize: GRID_PAGE_SIZE,
  });
  const q = parseSearchQuery(params.q);
  const { items: libraryItems, totalCount } = await getPublishedLibraryItemsPaginated(
    requestedPage,
    pageSize,
    category,
    q,
  );
  const page = clampPage(requestedPage, totalCount, pageSize);

  return (
    <>
      {/* Hero Section */}
      <PageHero title="Digital Library" description="A curated collection of Islamic books and materials for students. Open any title to read or download its PDF." />

      {/* Main Content Area */}
      <section className="bg-surface py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Search Form */}
          <div className="motion-safe:animate-fade-up mx-auto mb-10 max-w-2xl">
            <div className="card-elevated rounded-xl bg-surface p-4 shadow-md sm:p-5">
              <ListSearchForm action="/library" query={q} placeholder="Search books and materials..." />
            </div>
          </div>

          <div className="motion-safe:animate-fade-up mb-12">
            <LibraryCategoryFilter activeCategory={category} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {totalCount === 0 ? (
              <p className="col-span-full py-12 text-center text-muted motion-safe:animate-fade-up">
                {category
                  ? `No materials in “${category}” yet.`
                  : "No library items available yet."}
              </p>
            ) : (
              libraryItems.map((item, index) => {
                const animationDelay = `${(index % GRID_PAGE_SIZE) * 100}ms`;
                return (
                  <div 
                    key={item.id}
                    className="motion-safe:animate-fade-up h-full"
                    style={{ animationDelay, animationFillMode: 'both' }}
                  >
                    <LibraryCard item={item} />
                  </div>
                );
              })
            )}
          </div>

          {totalCount > 0 && (
            <div className="mt-16 motion-safe:animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
              <Pagination
                basePath="/library"
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
