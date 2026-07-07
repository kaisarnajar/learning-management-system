import type { Metadata } from "next";
import { BRAND_CONFIG } from "@/config/brand";
import { CourseCard } from "@/components/CourseCard";
import { Pagination } from "@/components/shared/Pagination";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { auth } from "@/lib/auth";
import { getPublicCoursesPaginated } from "@/lib/courses";
import { getUserCourseEnrollmentMap } from "@/lib/enrollments";
import { getPendingEnrollmentFeeSubmissionMap } from "@/lib/monthly-payments";
import { GRID_PAGE_SIZE, clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";
import { isUserProfileComplete } from "@/lib/profile";
import { Source_Serif_4 } from "next/font/google";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: "Courses",
  description: `View and enroll in upcoming courses at ${BRAND_CONFIG.name}.`,
};

import { Suspense } from "react";

type PageParams = {
 page?: string; q?: string
  [key: string]: string | undefined;
};

async function PublicCoursesList({ params, q, userId }: { params: PageParams; q?: string; userId?: string }) {
  const { page: requestedPage, pageSize } = parsePaginationParams(params, {
    pageSize: GRID_PAGE_SIZE,
  });

  const [
    { items: courses, totalCount },
    enrollmentMap,
    pendingEnrollmentPaymentCourses,
    profileComplete
  ] = await Promise.all([
    getPublicCoursesPaginated(requestedPage, pageSize, q),
    userId ? getUserCourseEnrollmentMap(userId) : Promise.resolve(new Map()),
    userId ? getPendingEnrollmentFeeSubmissionMap(userId) : Promise.resolve(new Set<string>()),
    userId ? isUserProfileComplete(userId) : Promise.resolve(true),
  ]);

  const page = clampPage(requestedPage, totalCount, pageSize);

  if (totalCount === 0) {
    return (
      <p className="col-span-full py-12 text-center text-lg text-muted motion-safe:animate-fade-up">No courses available at the moment.</p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course, index) => {
          const enrollment = enrollmentMap.get(course.id);
          const animationDelay = `${(index % GRID_PAGE_SIZE) * 100}ms`;
          return (
            <div 
              key={course.id} 
              className="h-full motion-safe:animate-fade-up"
              style={{ animationDelay, animationFillMode: 'both' }}
            >
              <CourseCard
                course={course}
                isEnrolled={enrollment?.status === "active" || enrollment?.status === "completed"}
                enrollmentStatus={enrollment?.status ?? null}
                enrollmentId={enrollment?.id ?? null}
                profileComplete={profileComplete}
                hasPendingEnrollmentPayment={pendingEnrollmentPaymentCourses.has(course.id)}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-16 motion-safe:animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
        <Pagination
          basePath="/courses"
          params={params}
          page={page}
          totalCount={totalCount}
          pageSize={pageSize}
        />
      </div>
    </>
  );
}

function CoursesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-[400px] w-full rounded-2xl bg-border/40 animate-pulse" />
      ))}
    </div>
  );
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<PageParams>;
}) {
  const params = await searchParams;
  const session = await auth();
  const q = parseSearchQuery(params.q);

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#003527] via-teal-900 to-[#002117] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="pattern-islamic absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" />
        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-[#cca72f]/0 via-[#cca72f] to-[#cca72f]/0 opacity-50"></div>
        <div className="mx-auto max-w-4xl text-center">
          <div className="motion-safe:animate-fade-up">
            <h1 className={`${sourceSerif.className} text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl`}>
              Course Announcements
            </h1>
            <div className="mx-auto mt-6 h-1 w-24 rounded-full bg-[#cca72f]"></div>
            <p className="mt-8 text-lg leading-relaxed text-white/90 sm:text-xl">
              Browse programs and request enrollment. Enrollment and monthly fees are set per course; see each listing for details.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="bg-surface py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Search Form */}
          <div className="motion-safe:animate-fade-up mx-auto mb-12 max-w-2xl">
            <div className="card-elevated rounded-xl bg-surface p-4 shadow-md sm:p-5">
              <ListSearchForm action="/courses" query={q} placeholder="Search courses by title, category, or teacher..." />
            </div>
          </div>

          <Suspense fallback={<CoursesSkeleton />}>
            <PublicCoursesList params={params} q={q} userId={session?.user?.id} />
          </Suspense>
        </div>
      </section>
    </>
  );
}

