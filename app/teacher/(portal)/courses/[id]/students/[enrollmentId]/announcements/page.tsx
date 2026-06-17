import Link from "next/link";
import { notFound } from "next/navigation";
import { TeacherCourseAnnouncementCard } from "@/components/teacher/TeacherCourseAnnouncementCard";
import { Pagination } from "@/components/shared/Pagination";
import { requireTeacher } from "@/lib/auth-actions";
import {
  canTeacherManageCourseAnnouncement,
  getAnnouncementAuthorName,
  getStudentAnnouncementsForEnrollmentPaginated,
} from "@/lib/announcements";
import { GRID_PAGE_SIZE, clampPage, parsePaginationParams } from "@/lib/pagination";
import { getTeacherEnrollmentInCourse } from "@/lib/teacher-portal";

export default async function TeacherStudentAnnouncementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; enrollmentId: string }>;
  searchParams: Promise<{ posted?: string; saved?: string; deleted?: string; error?: string; page?: string }>;
}) {
  const { id, enrollmentId } = await params;
  const query = await searchParams;
  const { teacher } = await requireTeacher();
  const data = await getTeacherEnrollmentInCourse(teacher.id, id, enrollmentId);

  if (!data) notFound();

  const { course, enrollment } = data;
  const studentName = enrollment.user.name?.trim() || enrollment.user.email;
  const { page: requestedPage, pageSize } = parsePaginationParams(query, {
    pageSize: GRID_PAGE_SIZE,
  });
  const { items: announcements, totalCount } = await getStudentAnnouncementsForEnrollmentPaginated(
    enrollment.id,
    requestedPage,
    pageSize,
  );
  const page = clampPage(requestedPage, totalCount, pageSize);

  return (
    <div>
      <Link href={`/teacher/courses/${course.id}`} className="text-sm font-medium text-primary hover:underline">
        ← Back to students
      </Link>
      <h2 className="mt-4 font-serif text-xl font-semibold text-foreground">{studentName}</h2>
      <p className="mt-1 text-sm text-muted">
        Private announcements for this student only — exam marks, feedback, and personal updates.
      </p>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Only {studentName} will see messages posted here.</p>
        <Link
          href={`/teacher/courses/${course.id}/students/${enrollment.id}/announcements/new`}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-light"
        >
          New message
        </Link>
      </div>

      {query.posted === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">
          Message sent to {studentName}.
        </p>
      )}
      {query.saved === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">Message updated.</p>
      )}
      {query.deleted === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">Message deleted.</p>
      )}
      {query.error === "notfound" && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text">That message could not be found.</p>
      )}

      {totalCount === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center text-sm text-muted">
          No private messages for {studentName} yet.
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {announcements.map((announcement) => {
            const canManage = canTeacherManageCourseAnnouncement(announcement, teacher.id);
            return (
              <li key={announcement.id} className="h-full">
                <TeacherCourseAnnouncementCard
                  courseId={course.id}
                  announcementId={announcement.id}
                  category={announcement.category}
                  title={announcement.title}
                  body={announcement.body}
                  authorName={getAnnouncementAuthorName(announcement)}
                  createdAt={announcement.createdAt}
                  updatedAt={announcement.updatedAt}
                  attachmentPath={announcement.attachmentPath}
                  attachmentName={announcement.attachmentName}
                  canManage={canManage}
                  enrollmentId={enrollment.id}
                  audienceLabel={`For ${studentName}`}
                />
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        basePath={`/teacher/courses/${course.id}/students/${enrollment.id}/announcements`}
        params={query}
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </div>
  );
}
