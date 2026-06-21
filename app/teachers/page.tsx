import type { Metadata } from "next";
import { TeacherCard } from "@/components/TeacherCard";
import { PageHeader } from "@/components/site/PageHeader";
import { Section } from "@/components/site/Section";
import { Pagination } from "@/components/shared/Pagination";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { GRID_PAGE_SIZE, clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";
import { getPublishedTeachersPaginated } from "@/lib/teachers";

export const metadata: Metadata = {
  title: "Teachers",
  description: "Meet the qualified scholars and instructors at Darse Quran Academy.",
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
    <Section>
      <PageHeader
        title="Our Teachers"
        description="Learn from experienced scholars dedicated to clear, authentic Islamic education—online and at your pace."
      />

      <div className="mt-6 mb-8 max-w-md">
        <ListSearchForm action="/teachers" query={q} placeholder="Search teachers..." />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {totalCount === 0 ? (
          <p className="col-span-full text-center text-muted">No teachers listed yet.</p>
        ) : (
          teachers.map((teacher) => <TeacherCard key={teacher.id} teacher={teacher} />)
        )}
      </div>

      <Pagination
        basePath="/teachers"
        params={params}
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </Section>
  );
}
