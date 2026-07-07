import Link from "next/link";
import { notFound } from "next/navigation";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";
import { Pagination } from "@/components/shared/Pagination";
import { requireUser } from "@/services/auth-actions";
import {
  getAnnouncementAuthorName,
  getAnnouncementsVisibleToStudentPaginated,
} from "@/services/announcements";
import { GRID_PAGE_SIZE, clampPage, parsePaginationParams } from "@/utils/pagination";
import { getStudentCourseForAnnouncements } from "@/services/student-announcements";

export default async function StudentCourseAnnouncementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ page?: string; coursePage?: string }>;
}) {
  const { courseId } = await params;
  const queryParams = await searchParams;
  const session = await requireUser();
  const data = await getStudentCourseForAnnouncements(session.user.id, courseId);

  if (!data) notFound();

  const { course } = data;
  const { page: personalPage, pageSize } = parsePaginationParams(queryParams, {
    pageSize: GRID_PAGE_SIZE,
  });
  const { page: courseWidePage, pageSize: courseWidePageSize } = parsePaginationParams(queryParams, {
    pageSize: GRID_PAGE_SIZE,
    pageParam: "coursePage",
  });

  const { courseWide, personal, courseWideTotal, personalTotal } =
    await getAnnouncementsVisibleToStudentPaginated(
      session.user.id,
      courseId,
      personalPage,
      courseWidePage,
      pageSize,
    );

  const safePersonalPage = clampPage(personalPage, personalTotal, pageSize);
  const safeCourseWidePage = clampPage(courseWidePage, courseWideTotal, courseWidePageSize);
  const hasAny = personalTotal > 0 || courseWideTotal > 0;

  return (
    <div>
      <Link href="/profile/courses" className="text-sm font-medium text-primary hover:underline">
        ← My courses
      </Link>
      <h2 className="mt-4 font-serif text-xl font-semibold text-foreground">{course.title}</h2>
      <p className="mt-1 text-sm text-muted">
        Course announcements from your instructor and the academy
      </p>

      {!hasAny ? (
        <p className="mt-8 rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center text-sm text-muted">
          No announcements yet. Check back later.
        </p>
      ) : (
        <div className="mt-8 space-y-10">
          {personalTotal > 0 && (
            <section>
              <h3 className="font-serif text-lg font-semibold text-foreground">For you</h3>
              <p className="mt-1 text-sm text-muted">Private messages from your instructor</p>
              <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {personal.map((announcement) => (
                  <li key={announcement.id}>
                    <AnnouncementCard
                      category={announcement.category}
                      title={announcement.title}
                      body={announcement.body}
                      authorName={getAnnouncementAuthorName(announcement)}
                      createdAt={announcement.createdAt}
                      updatedAt={announcement.updatedAt}
                      attachmentPath={announcement.attachmentPath}
                      attachmentName={announcement.attachmentName}
                      audienceLabel="For you only"
                    />
                  </li>
                ))}
              </ul>

              <Pagination
                basePath={`/profile/courses/${courseId}/announcements`}
                params={queryParams}
                page={safePersonalPage}
                totalCount={personalTotal}
                pageSize={pageSize}
              />
            </section>
          )}

          {courseWideTotal > 0 && (
            <section>
              <h3 className="font-serif text-lg font-semibold text-foreground">Course-wide</h3>
              <p className="mt-1 text-sm text-muted">Visible to everyone in this course</p>
              <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {courseWide.map((announcement) => (
                  <li key={announcement.id}>
                    <AnnouncementCard
                      category={announcement.category}
                      title={announcement.title}
                      body={announcement.body}
                      authorName={getAnnouncementAuthorName(announcement)}
                      createdAt={announcement.createdAt}
                      updatedAt={announcement.updatedAt}
                      attachmentPath={announcement.attachmentPath}
                      attachmentName={announcement.attachmentName}
                    />
                  </li>
                ))}
              </ul>

              <Pagination
                basePath={`/profile/courses/${courseId}/announcements`}
                params={queryParams}
                page={safeCourseWidePage}
                totalCount={courseWideTotal}
                pageSize={courseWidePageSize}
                pageParam="coursePage"
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
