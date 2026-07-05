import Link from "next/link";
import { CourseDurationDisplay } from "@/components/courses/CourseDurationDisplay";
import { Pagination } from "@/components/shared/Pagination";
import { requireUser } from "@/lib/auth-actions";
import { Suspense } from "react";

import {
  AWAITING_ENROLLMENT_FEE,
  PENDING_ENROLLMENT_APPROVAL,
} from "@/lib/enrollment-status";
import { enrollmentStatusLabel, getUserEnrollmentsPaginated } from "@/lib/enrollments";
import { getPendingEnrollmentFeeSubmissionMap } from "@/lib/monthly-payments";
import { GRID_PAGE_SIZE, clampPage, parsePaginationParams } from "@/lib/pagination";
import { formatRollNumber } from "@/lib/roll-numbers";
import { ActionToast } from "@/components/shared/ToastProvider";


type PageParams = {
 declined?: string; page?: string
  [key: string]: string | undefined;
};

async function CoursesContent({ params, userId }: { params: PageParams; userId: string }) {
  const { page: requestedPage, pageSize } = parsePaginationParams(params, {
    pageSize: GRID_PAGE_SIZE,
  });

  const [enrollmentsPaginated, pendingEnrollmentPayments] = await Promise.all([
    getUserEnrollmentsPaginated(userId, requestedPage, pageSize),
    getPendingEnrollmentFeeSubmissionMap(userId),
  ]);

  const enrollments = enrollmentsPaginated.items;
  const totalCount = enrollmentsPaginated.totalCount;
  const page = clampPage(requestedPage, totalCount, pageSize);

  const courseIds = [...new Set(enrollments.map((e) => e.courseId))];
  const courseMap = await import("@/lib/courses").then((m) => m.getCoursesByIds(courseIds));

  const enrollmentRows = enrollments.map((enrollment) => ({
    enrollment,
    course: courseMap.get(enrollment.courseId),
  }));

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {totalCount > 0 && (
          <Link
            href="/courses"
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light transition-colors shrink-0 self-start"
          >
            View All Courses
          </Link>
        )}
      </div>

      <ActionToast trigger={params.declined === "1"} paramName="declined" message="Your previous payment was declined. Use the payment link below to submit again." variant="error" />

      {totalCount === 0 ? (
        <div className="mt-6 rounded-lg border border-border bg-surface p-6 text-center">
          <p className="text-muted">You have not enrolled in any courses yet.</p>
          <Link
            href="/courses"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-light"
          >
            Browse Courses
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {enrollmentRows.map(({ enrollment, course }) => {
            if (!course) return null;
            const isActive = enrollment.status === "active" || enrollment.status === "completed";
            const awaitingEnrollmentFee = enrollment.status === AWAITING_ENROLLMENT_FEE;
            const hasPendingEnrollmentPayment = pendingEnrollmentPayments.has(course.id);

            return (
              <li key={enrollment.id} className="card-elevated flex flex-col p-5">
                <span className="w-fit rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium text-primary">
                  {awaitingEnrollmentFee && hasPendingEnrollmentPayment
                    ? "Awaiting payment verification"
                    : enrollmentStatusLabel(enrollment.status)}
                </span>
                {enrollment.rollNumber != null && (
                  <span className="mt-2 w-fit rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                    Roll No: {formatRollNumber(enrollment.rollNumber)}
                  </span>
                )}
                <h3 className="mt-2 font-serif text-lg font-semibold text-foreground">{course.title}</h3>
                <p className="mt-2 flex-1 whitespace-pre-wrap text-sm text-muted">{course.description}</p>
                <p className="mt-3 text-sm text-primary">Starts: {course.startDate}</p>
                <CourseDurationDisplay duration={course.duration} className="mt-1 text-primary/80" />

                {awaitingEnrollmentFee && (
                  <Link
                    href={
                      hasPendingEnrollmentPayment
                        ? "/profile/payments"
                        : `/profile/courses/${course.id}/enrollment-pay`
                    }
                    className="mt-4 flex min-h-11 items-center justify-center rounded-full border border-warning-text/30 bg-warning-bg px-4 py-3 text-sm font-semibold text-warning-text hover:bg-warning-bg"
                  >
                    {hasPendingEnrollmentPayment ? "Awaiting payment verification" : "Pay enrollment fee"}
                  </Link>
                )}

                {enrollment.status === PENDING_ENROLLMENT_APPROVAL && (
                  <p className="mt-4 text-sm text-warning-text">Awaiting enrollment approval by the academy.</p>
                )}

                {isActive && enrollment.status === "active" && (
                  course.monthlyFeeInrPaise > 0 ? (
                    <Link
                      href={`/profile/courses/${course.id}/pay`}
                      className="mt-4 flex min-h-11 items-center justify-center rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-light"
                    >
                      Pay Fee
                    </Link>
                  ) : (
                    <span className="mt-4 flex min-h-11 items-center justify-center rounded-full bg-surface-muted px-4 py-3 text-sm font-medium text-muted cursor-not-allowed">
                      No fee required
                    </span>
                  )
                )}

                {isActive && (
                  <>
                    <Link
                      href={`/profile/courses/${course.id}/announcements`}
                      className="mt-3 flex min-h-11 items-center justify-center rounded-full border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent-muted/30"
                    >
                      Course announcements
                    </Link>
                    <Link
                      href={`/profile/courses/${course.id}/attendance`}
                      className="mt-3 flex min-h-11 items-center justify-center rounded-full border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent-muted/30"
                    >
                      My attendance
                    </Link>
                    <Link
                      href={`/profile/courses/${course.id}/grades`}
                      className="mt-3 flex min-h-11 items-center justify-center rounded-full border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent-muted/30"
                    >
                      My grade card
                    </Link>
                  </>
                )}



                {enrollment.completedAt && (
                  <p className="mt-3 text-xs text-muted">
                    Completed {enrollment.completedAt.toLocaleDateString("en-IN")}
                  </p>
                )}

                {!isActive && !awaitingEnrollmentFee && enrollment.status !== PENDING_ENROLLMENT_APPROVAL && (
                  <p className="mt-4 text-xs text-muted">
                    Requested {enrollment.createdAt.toLocaleDateString("en-IN")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        basePath="/profile/courses"
        params={params}
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </>
  );
}

function CoursesSkeleton() {
  return (
    <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <li key={i} className="card-elevated flex flex-col p-5 h-[300px] bg-border/40 animate-pulse" />
      ))}
    </ul>
  );
}

export default async function ProfileCoursesPage({
  searchParams,
}: {
  searchParams: Promise<PageParams>;
}) {
  const session = await requireUser();
  const params = await searchParams;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-serif text-lg font-semibold text-foreground">My Courses</h2>
          <p className="mt-1 text-sm text-muted">
            {session.user.name ? `Welcome, ${session.user.name}. ` : ""}
            Enrolled programs and monthly fee payments appear below.
          </p>
        </div>
      </div>
      <Suspense fallback={<CoursesSkeleton />}>
        <CoursesContent params={params} userId={session.user.id} />
      </Suspense>
    </div>
  );
}
