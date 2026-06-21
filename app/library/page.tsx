import type { Metadata } from "next";
import { LibraryCard } from "@/components/LibraryCard";
import { LibraryCategoryFilter } from "@/components/library/LibraryCategoryFilter";
import { PageHeader } from "@/components/site/PageHeader";
import { Section } from "@/components/site/Section";
import { Pagination } from "@/components/shared/Pagination";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { isLibraryTopic } from "@/lib/library-options";
import { getPublishedLibraryItemsPaginated } from "@/lib/library";
import { GRID_PAGE_SIZE, clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";

export const metadata: Metadata = {
  title: "Library",
  description: "Browse Islamic books and study materials in the Darse Quran Academy digital library.",
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
    <Section>
      <PageHeader
        title="Digital Library"
        description="A curated collection of Islamic books and resources for students. PDF downloads will be available in a future update."
      />

      <div className="mt-8 mx-auto max-w-md">
        <ListSearchForm action="/library" query={q} placeholder="Search books and resources..." />
      </div>

      <div className="mt-10">
        <LibraryCategoryFilter activeCategory={category} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {totalCount === 0 ? (
          <p className="col-span-full text-center text-muted">
            {category
              ? `No resources in “${category}” yet.`
              : "No library items available yet."}
          </p>
        ) : (
          libraryItems.map((item) => <LibraryCard key={item.id} item={item} />)
        )}
      </div>

      <Pagination
        basePath="/library"
        params={params}
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </Section>
  );
}
