import Link from "next/link";
import { CourseStatusBadge } from "@/components/courses/CourseStatusBadge";
import { Pagination } from "@/components/shared/Pagination";
import { requireTeacher } from "@/services/auth-actions";
import { CourseThumbnail } from "@/components/courses/CourseThumbnail";
import { CourseDurationDisplay } from "@/components/courses/CourseDurationDisplay";
import { GRID_PAGE_SIZE, clampPage, parsePaginationParams } from "@/utils/pagination";
import { getCoursesForTeacherPaginated, getTeacherDashboardStats } from "@/services/teacher-portal";

export default async function TeacherDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const { teacher } = await requireTeacher();
  const { page: requestedPage, pageSize } = parsePaginationParams(params, {
    pageSize: GRID_PAGE_SIZE,
  });

  const [{ items: courses, totalCount }, stats] = await Promise.all([
    getCoursesForTeacherPaginated(teacher.id, requestedPage, pageSize),
    getTeacherDashboardStats(teacher.id),
  ]);
  const page = clampPage(requestedPage, totalCount, pageSize);

  return (
    <div>
      <div className="rounded-lg border border-border bg-surface p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Welcome back</p>
        <h1 className="mt-2 font-serif text-2xl font-bold text-foreground sm:text-3xl">{teacher.name}</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">{teacher.specialization}</p>
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface px-4 py-3">
            <dt className="text-xs text-muted">Courses</dt>
            <dd className="mt-1 text-2xl font-bold text-foreground">{stats.totalCourses}</dd>
          </div>
          <div className="rounded-lg border border-border bg-surface px-4 py-3">
            <dt className="text-xs text-muted">Students</dt>
            <dd className="mt-1 text-2xl font-bold text-foreground">{stats.totalStudents}</dd>
          </div>
          <div className="col-span-2 rounded-lg border border-border bg-surface px-4 py-3 sm:col-span-1">
            <dt className="text-xs text-muted">Login email</dt>
            <dd className="mt-1 truncate text-sm font-medium text-foreground">{teacher.email}</dd>
          </div>
        </dl>
      </div>

      <h2 className="mt-10 font-serif text-xl font-semibold text-foreground">Your courses</h2>
      <p className="mt-1 text-sm text-muted">
        View students, post announcements, and track course status.
      </p>

      {totalCount === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center text-sm text-muted">
          No courses are assigned to you yet. Contact the academy admin.
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {courses.map((course) => (
            <li key={course.id}>
              <article className="card-elevated overflow-hidden">
                <CourseThumbnail category={course.category} size="sm" />
                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <CourseStatusBadge status={course.status} />
                    <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-muted">
                      {course.level}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-bold text-foreground">{course.title}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {course.category} · Starts {course.startDate}
                  </p>
                  <CourseDurationDisplay duration={course.duration} className="mt-1" />
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{course.description}</p>
                  <p className="mt-3 text-sm text-muted">
                    <span className="font-semibold text-foreground">{course.studentCount}</span>{" "}
                    student{course.studentCount === 1 ? "" : "s"} enrolled
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    <Link
                      href={`/teacher/courses/${course.id}`}
                      className="btn-gold-solid inline-flex flex-1 items-center justify-center py-2.5 text-xs"
                    >
                      Students
                    </Link>
                    <Link
                      href={`/teacher/courses/${course.id}/announcements`}
                      className="inline-flex flex-1 items-center justify-center rounded-md border border-border bg-surface py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent-muted/50"
                    >
                      Announcements
                    </Link>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        basePath="/teacher"
        params={params}
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </div>
  );
}
