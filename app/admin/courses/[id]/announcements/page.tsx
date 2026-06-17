import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteAdminCourseAnnouncement } from "@/lib/course-announcement-actions";
import { AdminCourseAnnouncementCard } from "@/components/admin/AdminCourseAnnouncementCard";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { requireAdmin } from "@/lib/auth-actions";
import { getAnnouncementAuthorName, getCourseWideAnnouncementsForCoursePaginated } from "@/lib/announcements";
import { getCourseById } from "@/lib/courses";
import { GRID_PAGE_SIZE, clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";

export default async function AdminCourseAnnouncementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ posted?: string; saved?: string; deleted?: string; error?: string; page?: string; q?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const q = parseSearchQuery(query.q);
  const course = await getCourseById(id);

  if (!course) notFound();

  const { page: requestedPage, pageSize } = parsePaginationParams(query, {
    pageSize: GRID_PAGE_SIZE,
  });
  const { items: announcements, totalCount } = await getCourseWideAnnouncementsForCoursePaginated(
    course.id,
    requestedPage,
    pageSize,
    q,
  );
  const page = clampPage(requestedPage, totalCount, pageSize);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Post course-wide updates for enrolled students — schedule changes, academy notices, and more.
        </p>
        <Link
          href={`/admin/courses/${course.id}/announcements/new`}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-light"
        >
          New announcement
        </Link>
      </div>

      {query.posted === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">
          Announcement posted successfully.
        </p>
      )}
      {query.saved === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">Announcement updated.</p>
      )}
      {query.deleted === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">Announcement deleted.</p>
      )}
      {query.error === "notfound" && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text">
          That announcement could not be found.
        </p>
      )}

      <div className="mt-6">
        <ListSearchForm
          action={`/admin/courses/${course.id}/announcements`}
          query={q}
          placeholder="Search by title, body, or author"
          totalCount={q ? totalCount : undefined}
        />
      </div>

      {totalCount === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center text-sm text-muted">
          {q ? "No announcements match your search." : "No announcements for this course yet."}
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {announcements.map((announcement) => (
            <li key={announcement.id} className="h-full">
              <AdminCourseAnnouncementCard
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
                deleteAction={deleteAdminCourseAnnouncement}
              />
            </li>
          ))}
        </ul>
      )}

      <Pagination
        basePath={`/admin/courses/${course.id}/announcements`}
        params={query}
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </div>
  );
}
