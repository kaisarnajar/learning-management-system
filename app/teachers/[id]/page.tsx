import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/site/PageHeader";
import { Section } from "@/components/site/Section";
import { Pagination } from "@/components/shared/Pagination";
import { getPublicCoursesByTeacherIdPaginated } from "@/lib/courses";
import { GRID_PAGE_SIZE, clampPage, parsePaginationParams } from "@/lib/pagination";
import { getPublishedTeacherById } from "@/lib/teachers";

type TeacherPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: TeacherPageProps): Promise<Metadata> {
  const { id } = await params;
  const teacher = await getPublishedTeacherById(id);
  if (!teacher) return { title: "Instructor not found" };
  return {
    title: teacher.name,
    description: teacher.specialization,
  };
}

export default async function TeacherPage({ params, searchParams }: TeacherPageProps) {
  const { id } = await params;
  const queryParams = await searchParams;
  const { page: requestedPage, pageSize } = parsePaginationParams(queryParams, {
    pageSize: GRID_PAGE_SIZE,
  });

  const [teacher, coursesPaginated] = await Promise.all([
    getPublishedTeacherById(id),
    getPublicCoursesByTeacherIdPaginated(id, requestedPage, pageSize),
  ]);
  if (!teacher) notFound();

  const courses = coursesPaginated.items;
  const courseTotalCount = coursesPaginated.totalCount;
  const page = clampPage(requestedPage, courseTotalCount, pageSize);

  return (
    <Section>
      <Link href="/teachers" className="text-sm font-medium text-gold hover:underline">
        ← All teachers
      </Link>
      <div className="mx-auto mt-6 max-w-2xl">
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:gap-6 sm:text-left">
          {teacher.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={teacher.imageUrl}
              alt={teacher.name}
              className="h-24 w-24 shrink-0 rounded-xl object-cover ring-2 ring-gold/30"
            />
          ) : (
            <span
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-teal-800 text-2xl font-bold text-white"
              aria-hidden
            >
              {teacher.initials}
            </span>
          )}
          <div className="mt-4 sm:mt-0">
            <PageHeader title={teacher.name} description={teacher.specialization} />
          </div>
        </div>
        <p className="mt-8 text-base leading-relaxed text-muted">{teacher.bio}</p>

        {courseTotalCount > 0 && (
          <section className="mt-10">
            <h2 className="font-serif text-lg font-semibold text-foreground">Courses</h2>
            <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-surface">
              {courses.map((course) => (
                <li
                  key={course.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-foreground">{course.title}</p>
                    <p className="mt-0.5 text-sm text-muted">{course.category}</p>
                  </div>
                  <Link
                    href={`/courses/${course.id}`}
                    className="btn-gold-solid inline-flex shrink-0 justify-center px-6 py-2.5 text-sm"
                  >
                    View course
                  </Link>
                </li>
              ))}
            </ul>

            <Pagination
              basePath={`/teachers/${id}`}
              params={queryParams}
              page={page}
              totalCount={courseTotalCount}
              pageSize={pageSize}
            />
          </section>
        )}
      </div>
    </Section>
  );
}
