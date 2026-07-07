import Link from "next/link";
import { notFound } from "next/navigation";
import { TeacherCourseAnnouncementCard } from "@/components/teacher/TeacherCourseAnnouncementCard";
import { Pagination } from "@/components/shared/Pagination";
import { requireTeacher } from "@/services/auth-actions";
import {
  canTeacherManageCourseAnnouncement,
  getAnnouncementAuthorName,
  getCourseWideAnnouncementsForCoursePaginated,
} from "@/services/announcements";
import { GRID_PAGE_SIZE, clampPage, parsePaginationParams } from "@/utils/pagination";
import { getTeacherCourseForPortal } from "@/services/teacher-portal";
import { ActionToast } from "@/components/shared/ToastProvider";


export default async function TeacherCourseAnnouncementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ posted?: string; saved?: string; deleted?: string; error?: string; forbidden?: string; page?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { teacher } = await requireTeacher();
  const course = await getTeacherCourseForPortal(teacher.id, id);

  if (!course) notFound();

  const { page: requestedPage, pageSize } = parsePaginationParams(query, {
    pageSize: GRID_PAGE_SIZE,
  });
  const { items: announcements, totalCount } = await getCourseWideAnnouncementsForCoursePaginated(
    course.id,
    requestedPage,
    pageSize,
  );
  const page = clampPage(requestedPage, totalCount, pageSize);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Course-wide updates for all enrolled students. To message one student (e.g. exam marks), use{" "}
          <span className="font-medium text-foreground">Message</span> on the Students tab.
        </p>
        <Link
          href={`/teacher/courses/${course.id}/announcements/new`}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-light"
        >
          New announcement
        </Link>
      </div>

      <ActionToast trigger={query.posted === "1"} paramName="posted" message="Announcement posted successfully. Enrolled students have been notified by email — if they don't see it, ask them to check their Spam/Junk folder." variant="info" />
      <ActionToast trigger={query.saved === "1"} paramName="saved" message="Announcement updated." variant="info" />
      <ActionToast trigger={query.deleted === "1"} paramName="deleted" message="Announcement deleted." variant="info" />
      {query.error === "notfound" && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text">
          That announcement could not be found.
        </p>
      )}
      {query.error === "forbidden" && (
        <p className="mt-4 rounded-md bg-warning-bg px-4 py-3 text-sm text-warning-text">
          Only your own announcements can be edited or deleted. Academy admin posts are managed from the admin portal.
        </p>
      )}

      {totalCount === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center text-sm text-muted">
          No announcements for this course yet.
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
                  postedByAdmin={announcement.postedByAdmin}
                />
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        basePath={`/teacher/courses/${course.id}/announcements`}
        params={query}
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </div>
  );
}
