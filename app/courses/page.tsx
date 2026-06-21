import type { Metadata } from "next";
import { CourseCard } from "@/components/CourseCard";
import { PageHeader } from "@/components/site/PageHeader";
import { Section } from "@/components/site/Section";
import { Pagination } from "@/components/shared/Pagination";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { auth } from "@/lib/auth";
import { getPublicCoursesPaginated } from "@/lib/courses";
import { getUserCourseEnrollmentMap } from "@/lib/enrollments";
import { getPendingEnrollmentFeeSubmissionMap } from "@/lib/monthly-payments";
import { GRID_PAGE_SIZE, clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";
import { isUserProfileComplete } from "@/lib/profile";

export const metadata: Metadata = {
  title: "Courses",
  description: "View and enroll in upcoming courses at Darse Quran Academy.",
};

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const { page: requestedPage, pageSize } = parsePaginationParams(params, {
    pageSize: GRID_PAGE_SIZE,
  });
  const q = parseSearchQuery(params.q);
  const { items: courses, totalCount } = await getPublicCoursesPaginated(requestedPage, pageSize, q);
  const page = clampPage(requestedPage, totalCount, pageSize);

  const enrollmentMap = session?.user?.id
    ? await getUserCourseEnrollmentMap(session.user.id)
    : new Map();
  const pendingEnrollmentPaymentCourses = session?.user?.id
    ? await getPendingEnrollmentFeeSubmissionMap(session.user.id)
    : new Set<string>();
  const profileComplete = session?.user?.id
    ? await isUserProfileComplete(session.user.id)
    : true;

  return (
    <Section>
      <PageHeader
        title="Course Announcements"
        description="Browse programs and request enrollment. Enrollment and monthly fees are set per course; see each listing for details."
      />

      <div className="mt-6 mb-8 max-w-md">
        <ListSearchForm action="/courses" query={q} placeholder="Search courses by title, category, or teacher..." />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {totalCount === 0 ? (
          <p className="col-span-full text-center text-muted">No courses available at the moment.</p>
        ) : (
          courses.map((course) => {
            const enrollment = enrollmentMap.get(course.id);
            return (
              <CourseCard
                key={course.id}
                course={course}
                isEnrolled={enrollment?.status === "active" || enrollment?.status === "completed"}
                enrollmentStatus={enrollment?.status ?? null}
                enrollmentId={enrollment?.id ?? null}
                profileComplete={profileComplete}
                hasPendingEnrollmentPayment={pendingEnrollmentPaymentCourses.has(course.id)}
              />
            );
          })
        )}
      </div>

      <Pagination
        basePath="/courses"
        params={params}
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </Section>
  );
}
