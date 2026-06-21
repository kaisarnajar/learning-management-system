import type { Metadata } from "next";
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
          <div className="motion-safe:animate-fade-up relative z-10 mx-auto -mt-20 mb-16 max-w-2xl sm:-mt-24">
            <div className="card-elevated rounded-2xl bg-surface p-4 shadow-2xl ring-1 ring-border sm:p-5">
              <ListSearchForm action="/courses" query={q} placeholder="Search courses by title, category, or teacher..." />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {totalCount === 0 ? (
              <p className="col-span-full py-12 text-center text-lg text-muted motion-safe:animate-fade-up">No courses available at the moment.</p>
            ) : (
              courses.map((course, index) => {
                const enrollment = enrollmentMap.get(course.id);
                // Stagger animations based on index for a cascading effect
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
              })
            )}
          </div>

          {totalCount > 0 && (
            <div className="mt-16 motion-safe:animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
              <Pagination
                basePath="/courses"
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
