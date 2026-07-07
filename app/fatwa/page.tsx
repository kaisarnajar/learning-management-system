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
import { Source_Serif_4 } from "next/font/google";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: "Fatwa Section",
  description:
    `Browse answered questions on Islam, Quran, Hadith, Fiqh, and related topics. Submit your own question to ${BRAND_CONFIG.name}.`,
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
      <section className="relative overflow-hidden bg-gradient-to-br from-[#003527] via-teal-900 to-[#002117] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="pattern-islamic absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" />
        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-[#cca72f]/0 via-[#cca72f] to-[#cca72f]/0 opacity-50"></div>
        <div className="mx-auto max-w-4xl text-center">
          <div className="motion-safe:animate-fade-up">
            <h1 className={`${sourceSerif.className} text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl`}>
              Fatwa Section
            </h1>
            <div className="mx-auto mt-6 h-1 w-24 rounded-full bg-brand-gold-alt"></div>
            <p className="mt-8 text-lg leading-relaxed text-white/90 sm:text-xl">
              Questions answered by our scholars on Islam, Quran, Hadith, Fiqh, Tajweed, Seerah, and more.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/fatwa/ask"
                className="btn-gold-solid inline-flex min-h-12 items-center justify-center rounded-full px-8 py-3.5 text-base shadow-xl shadow-black/20"
              >
                Ask a question
              </Link>
            </div>
          </div>
        </div>
      </section>

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
