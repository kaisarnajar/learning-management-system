import type { Metadata } from "next";
import { BRAND_CONFIG } from "@/config/brand";
import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { Pagination } from "@/components/shared/Pagination";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { getPublishedBlogPostsPaginated } from "@/services/blogs";
import { GRID_PAGE_SIZE, clampPage, parsePaginationParams } from "@/utils/pagination";
import { parseSearchQuery } from "@/utils/text-search";
import { PageHero } from "@/components/shared/PageHero";

const baseUrl = BRAND_CONFIG.websiteUrl.replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Islamic Articles & Reflections",
  description: `Read insightful Islamic articles, Quranic reflections, Tajweed guides, and news from ${BRAND_CONFIG.name}.`,
  alternates: {
    canonical: `${baseUrl}/blog`,
  },
  openGraph: {
    title: `Islamic Articles & Reflections | ${BRAND_CONFIG.name}`,
    description: `Read insightful Islamic articles, Quranic reflections, Tajweed guides, and news from ${BRAND_CONFIG.name}.`,
    url: `${baseUrl}/blog`,
    siteName: BRAND_CONFIG.name,
    type: "website",
    images: [
      {
        url: BRAND_CONFIG.seo.openGraphImage,
        alt: `Blog - ${BRAND_CONFIG.name}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Islamic Articles & Reflections | ${BRAND_CONFIG.name}`,
    description: `Read insightful Islamic articles and reflections from ${BRAND_CONFIG.name}.`,
    images: [BRAND_CONFIG.seo.openGraphImage],
  },
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const { page: requestedPage, pageSize } = parsePaginationParams(params, {
    pageSize: GRID_PAGE_SIZE,
  });
  const q = parseSearchQuery(params.q);
  const { items: posts, totalCount } = await getPublishedBlogPostsPaginated(
    requestedPage,
    pageSize,
    q,
  );
  const page = clampPage(requestedPage, totalCount, pageSize);

  return (
    <>
      {/* Hero Section */}
      <PageHero title="Blog" description="Articles, guidance, and updates from our teachers and scholars." />

      {/* Main Content Area */}
      <section className="bg-surface py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Search Form */}
          <div className="motion-safe:animate-fade-up mx-auto mb-12 max-w-2xl">
            <div className="card-elevated rounded-xl bg-surface p-4 shadow-md sm:p-5">
              <ListSearchForm action="/blog" query={q} placeholder="Search blog posts..." />
            </div>
          </div>

          {totalCount === 0 ? (
            <p className="motion-safe:animate-fade-up mt-10 text-center text-muted py-12">
              {q ? "No blogs found matching your search." : "No blog posts published yet. Check back soon."}
            </p>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, index) => {
                const animationDelay = `${(index % GRID_PAGE_SIZE) * 100}ms`;
                return (
                  <div 
                    key={post.id}
                    className="motion-safe:animate-fade-up h-full"
                    style={{ animationDelay, animationFillMode: 'both' }}
                  >
                    <BlogPostCard post={post} />
                  </div>
                );
              })}
            </div>
          )}

          {totalCount > 0 && (
            <div className="mt-16 motion-safe:animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
              <Pagination
                basePath="/blog"
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
