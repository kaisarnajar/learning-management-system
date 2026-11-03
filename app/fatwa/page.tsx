import type { Metadata } from "next";
import { BRAND_CONFIG } from "@/config/brand";
import Link from "next/link";
import { FatwaCard } from "@/components/fatwa/FatwaCard";
import { FatwaCategoryFilter } from "@/components/fatwa/FatwaCategoryFilter";
import { Pagination } from "@/components/shared/Pagination";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { getAnsweredFatwasPaginated } from "@/services/fatwa";
import { GRID_PAGE_SIZE, clampPage, parsePaginationParams } from "@/utils/pagination";
import { parseSearchQuery } from "@/utils/text-search";
import { PageHero } from "@/components/shared/PageHero";

const baseUrl = BRAND_CONFIG.websiteUrl.replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Islamic Fatwa & Q&A",
  description: `Browse answered questions on Islamic jurisprudence, Fiqh, Quran, and daily guidance verified by scholars at ${BRAND_CONFIG.name}.`,
  alternates: {
    canonical: `${baseUrl}/fatwa`,
  },
  openGraph: {
    title: `Islamic Fatwa & Q&A | ${BRAND_CONFIG.name}`,
    description: `Browse answered questions on Islamic jurisprudence, Fiqh, Quran, and daily guidance verified by scholars at ${BRAND_CONFIG.name}.`,
    url: `${baseUrl}/fatwa`,
    siteName: BRAND_CONFIG.name,
    type: "website",
    images: [
      {
        url: BRAND_CONFIG.seo.openGraphImage,
        alt: `Fatwa - ${BRAND_CONFIG.name}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Islamic Fatwa & Q&A | ${BRAND_CONFIG.name}`,
    description: `Browse answered questions on Islamic jurisprudence and daily guidance verified by scholars at ${BRAND_CONFIG.name}.`,
    images: [BRAND_CONFIG.seo.openGraphImage],
  },
};

export default async function FatwaPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const category = params.category ? params.category : undefined;
  const { page: requestedPage, pageSize } = parsePaginationParams(params, {
    pageSize: GRID_PAGE_SIZE,
  });
  const q = parseSearchQuery(params.q);
  const { items: fatwas, totalCount } = await getAnsweredFatwasPaginated(
    requestedPage,
    pageSize,
    category,
    q,
  );
  const page = clampPage(requestedPage, totalCount, pageSize);

  return (
    <>
      {/* Hero Section */}
      <PageHero
        title="Fatwa Section"
        description="Questions answered by our scholars on Islam, Quran, Hadith, Fiqh, Tajweed, Seerah, and more."
      >
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/fatwa/ask"
            className="btn-gold-solid inline-flex min-h-12 items-center justify-center rounded-full px-8 py-3.5 text-base shadow-xl shadow-black/20"
          >
            Ask a question
          </Link>
        </div>
      </PageHero>

      {/* Main Content Area */}
      <section className="bg-surface py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Search Form */}
          <div className="motion-safe:animate-fade-up mx-auto mb-10 max-w-2xl">
            <div className="card-elevated rounded-xl bg-surface p-4 shadow-md sm:p-5">
              <ListSearchForm action="/fatwa" query={q} placeholder="Search answered fatwas..." />
            </div>
          </div>

          <div className="motion-safe:animate-fade-up mb-12">
            <FatwaCategoryFilter activeCategory={category} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {totalCount === 0 ? (
              <p className="col-span-full py-12 text-center text-muted motion-safe:animate-fade-up">
                {category
                  ? `No answered questions in “${category}” yet.`
                  : "No answered questions yet. Be the first to ask!"}
              </p>
            ) : (
              fatwas.map((fatwa, index) => {
                const animationDelay = `${(index % GRID_PAGE_SIZE) * 100}ms`;
                return (
                  <div 
                    key={fatwa.id}
                    className="motion-safe:animate-fade-up h-full"
                    style={{ animationDelay, animationFillMode: 'both' }}
                  >
                    <FatwaCard fatwa={fatwa} />
                  </div>
                );
              })
            )}
          </div>

          {totalCount > 0 && (
            <div className="mt-16 motion-safe:animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
              <Pagination
                basePath="/fatwa"
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
