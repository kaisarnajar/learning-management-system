import type { Metadata } from "next";
import { BRAND_CONFIG } from "@/config/brand";
import { CourseCard } from "@/components/CourseCard";
import { Pagination } from "@/components/shared/Pagination";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { auth } from "@/services/auth";
import { getPublicCoursesPaginated } from "@/services/courses";
import { getUserCourseEnrollmentMap } from "@/services/enrollments";
import { isApprovedEnrollment } from "@/services/status-compat";
import { getPendingEnrollmentFeeSubmissionMap } from "@/services/monthly-payments";
import { GRID_PAGE_SIZE, clampPage, parsePaginationParams } from "@/utils/pagination";
import { parseSearchQuery } from "@/utils/text-search";
import { isUserProfileComplete } from "@/services/profile";
import { PageHero } from "@/components/shared/PageHero";

const baseUrl = BRAND_CONFIG.websiteUrl.replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Online Quran & Islamic Courses",
  description: `Explore and enroll in structured Tajweed, Arabic language, Hifz, and Islamic studies courses at ${BRAND_CONFIG.name}. Qualified teachers & flexible schedules.`,
  alternates: {
    canonical: `${baseUrl}/courses`,
  },
  openGraph: {
    title: `Online Quran & Islamic Courses | ${BRAND_CONFIG.name}`,
    description: `Explore and enroll in structured Tajweed, Arabic language, Hifz, and Islamic studies courses at ${BRAND_CONFIG.name}. Qualified teachers & flexible schedules.`,
    url: `${baseUrl}/courses`,
    siteName: BRAND_CONFIG.name,
    type: "website",
    images: [
      {
        url: BRAND_CONFIG.seo.openGraphImage,
        alt: `Courses - ${BRAND_CONFIG.name}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Online Quran & Islamic Courses | ${BRAND_CONFIG.name}`,
    description: `Explore and enroll in structured Tajweed, Arabic language, Hifz, and Islamic studies courses at ${BRAND_CONFIG.name}.`,
    images: [BRAND_CONFIG.seo.openGraphImage],
  },
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
                isEnrolled={enrollment ? isApprovedEnrollment(enrollment) : false}
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
        <div key={i} className="h-ui-400 w-full rounded-2xl bg-border/40 animate-pulse" />
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
      <PageHero title="Courses" description="Browse programs and request enrollment. Enrollment and monthly fees are set per course; see each listing for details." />

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

