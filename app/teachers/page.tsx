import type { Metadata } from "next";
import { BRAND_CONFIG } from "@/config/brand";
import { TeacherCard } from "@/components/TeacherCard";
import { Pagination } from "@/components/shared/Pagination";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { GRID_PAGE_SIZE, clampPage, parsePaginationParams } from "@/utils/pagination";
import { parseSearchQuery } from "@/utils/text-search";
import { getPublishedTeachersPaginated } from "@/services/teachers";
import { PageHero } from "@/components/shared/PageHero";

const baseUrl = BRAND_CONFIG.websiteUrl.replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Qualified Islamic Scholars & Quran Teachers",
  description: `Meet the certified Quran, Tajweed, and Islamic studies scholars and instructors at ${BRAND_CONFIG.name}.`,
  alternates: {
    canonical: `${baseUrl}/teachers`,
  },
  openGraph: {
    title: `Qualified Islamic Scholars & Teachers | ${BRAND_CONFIG.name}`,
    description: `Meet the certified Quran, Tajweed, and Islamic studies scholars and instructors at ${BRAND_CONFIG.name}.`,
    url: `${baseUrl}/teachers`,
    siteName: BRAND_CONFIG.name,
    type: "website",
    images: [
      {
        url: BRAND_CONFIG.seo.openGraphImage,
        alt: `Teachers - ${BRAND_CONFIG.name}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Qualified Islamic Scholars & Teachers | ${BRAND_CONFIG.name}`,
    description: `Meet the certified Quran, Tajweed, and Islamic studies scholars at ${BRAND_CONFIG.name}.`,
    images: [BRAND_CONFIG.seo.openGraphImage],
  },
};

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const { page: requestedPage, pageSize } = parsePaginationParams(params, {
    pageSize: GRID_PAGE_SIZE,
  });
  const q = parseSearchQuery(params.q);
  const { items: teachers, totalCount } = await getPublishedTeachersPaginated(
    requestedPage,
    pageSize,
    q,
  );
  const page = clampPage(requestedPage, totalCount, pageSize);

  return (
    <>
      {/* Hero Section */}
      <PageHero title="Our Teachers" description="Learn from experienced scholars dedicated to clear, authentic Islamic education—online and at your pace." />

      {/* Main Content Area */}
      <section className="bg-surface py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Search Form */}
          <div className="motion-safe:animate-fade-up mx-auto mb-12 max-w-2xl">
            <div className="card-elevated rounded-xl bg-surface p-4 shadow-md sm:p-5">
              <ListSearchForm action="/teachers" query={q} placeholder="Search teachers..." />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {totalCount === 0 ? (
              <p className="col-span-full py-12 text-center text-muted motion-safe:animate-fade-up">No teachers listed yet.</p>
            ) : (
              teachers.map((teacher, index) => {
                const animationDelay = `${(index % GRID_PAGE_SIZE) * 100}ms`;
                return (
                  <div 
                    key={teacher.id}
                    className="motion-safe:animate-fade-up h-full"
                    style={{ animationDelay, animationFillMode: 'both' }}
                  >
                    <TeacherCard teacher={teacher} />
                  </div>
                );
              })
            )}
          </div>

          {totalCount > 0 && (
            <div className="mt-16 motion-safe:animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
              <Pagination
                basePath="/teachers"
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
