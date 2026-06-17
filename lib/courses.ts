import type { Course as PrismaCourse, CourseStatus, Teacher } from "@prisma/client";
import { isCoursePubliclyVisible } from "@/lib/course-status";
import { clampPage, paginationArgs, type PaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { buildSearchOr } from "@/lib/text-search";
import { withDbErrorHandling } from "@/lib/db-error";

function allCoursesWhere(searchQuery?: string) {
  if (!searchQuery) return undefined;
  return buildSearchOr(
    ["title", "category"],
    [{ relation: "teacher", fields: ["name"] }],
    searchQuery,
  );
}

export const HOMEPAGE_FEATURED_COURSES_MAX = 6;

export type Course = PrismaCourse;
export type CourseLevel = "Beginner" | "Intermediate" | "Advanced";

export type CourseWithTeacher = Course & {
  teacher: Teacher | null;
};

const courseWithTeacherInclude = { teacher: true } as const;

export function formatPrice(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export async function getPublicCoursesPaginated(
  page: number,
  pageSize: number,
): Promise<PaginatedResult<CourseWithTeacher>> {
  const where = { status: { not: "DRAFT" as const } };
  const totalCount = await withDbErrorHandling(() => prisma.course.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.course.findMany({
      where,
      include: courseWithTeacherInclude,
      orderBy: { createdAt: "desc" },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getFeaturedHomepageCourses(): Promise<CourseWithTeacher[]> {
  const courses = await withDbErrorHandling(() => prisma.course.findMany({
      where: { featuredOnHomepage: true },
      include: courseWithTeacherInclude,
      orderBy: [{ featuredAt: "desc" }, { updatedAt: "desc" }],
      take: HOMEPAGE_FEATURED_COURSES_MAX,
    }), "Database operation failed");
  return courses.filter((c) => isCoursePubliclyVisible(c.status));
}

export async function getFeaturedHomepageCourseCount(): Promise<number> {
  const courses = await withDbErrorHandling(() => prisma.course.findMany({
      where: { featuredOnHomepage: true },
      select: { status: true },
    }), "Database operation failed");
  return courses.filter((c) => isCoursePubliclyVisible(c.status)).length;
}

export async function resolveCourseFeaturedUpdate(options: {
  status: CourseStatus;
  requestFeatured: boolean;
  currentlyFeatured: boolean;
  currentFeaturedAt: Date | null;
}): Promise<
  | { featuredOnHomepage: boolean; featuredAt: Date | null }
  | { error: string }
> {
  if (options.status === "DRAFT" || !options.requestFeatured) {
    return { featuredOnHomepage: false, featuredAt: null };
  }

  if (options.currentlyFeatured) {
    return {
      featuredOnHomepage: true,
      featuredAt: options.currentFeaturedAt ?? new Date(),
    };
  }

  const featuredCount = await getFeaturedHomepageCourseCount();
  if (featuredCount >= HOMEPAGE_FEATURED_COURSES_MAX) {
    return {
      error: `The homepage already has ${HOMEPAGE_FEATURED_COURSES_MAX} featured courses. Remove one before adding another.`,
    };
  }

  return { featuredOnHomepage: true, featuredAt: new Date() };
}

export async function getAllCourses(): Promise<CourseWithTeacher[]> {
  return withDbErrorHandling(() => prisma.course.findMany({
      include: courseWithTeacherInclude,
      orderBy: { createdAt: "desc" },
    }), "Database operation failed");
}

/** Course IDs whose title matches a search query (for models that only store courseId). */
export async function getCourseIdsByTitleSearch(searchQuery: string): Promise<string[]> {
  const courses = await withDbErrorHandling(() => prisma.course.findMany({
      where: { title: { contains: searchQuery } },
      select: { id: true },
    }), "Database operation failed");
  return courses.map((course) => course.id);
}

export async function getAllCoursesPaginated(
  page: number,
  pageSize: number,
  searchQuery?: string,
): Promise<PaginatedResult<CourseWithTeacher>> {
  const where = allCoursesWhere(searchQuery);
  const totalCount = await withDbErrorHandling(() => prisma.course.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.course.findMany({
      where,
      include: courseWithTeacherInclude,
      orderBy: { createdAt: "desc" },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getCourseById(id: string): Promise<CourseWithTeacher | null> {
  return withDbErrorHandling(() => prisma.course.findUnique({
      where: { id },
      include: courseWithTeacherInclude,
    }), "Database operation failed");
}

export async function getPublicCoursesByTeacherIdPaginated(
  teacherId: string,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<CourseWithTeacher>> {
  const where = { teacherId, status: { not: "DRAFT" as const } };
  const totalCount = await withDbErrorHandling(() => prisma.course.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.course.findMany({
      where,
      include: courseWithTeacherInclude,
      orderBy: { createdAt: "desc" },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getPublicCourseById(id: string): Promise<CourseWithTeacher | null> {
  const course = await getCourseById(id);
  if (!course || !isCoursePubliclyVisible(course.status)) return null;
  return course;
}
