import type { AnnouncementCategory } from "@prisma/client";
import Link from "next/link";
import { AnnouncementCategoryBadge } from "@/components/announcements/AnnouncementCategoryBadge";
import { DeleteAnnouncementButton } from "@/components/teacher/DeleteAnnouncementButton";
import { formatAnnouncementDate } from "@/lib/announcements";

type TeacherCourseAnnouncementCardProps = {
  courseId: string;
  announcementId: string;
  category: AnnouncementCategory;
  title: string;
  body: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
  attachmentPath?: string | null;
  attachmentName?: string | null;
  canManage: boolean;
  postedByAdmin?: boolean;
  enrollmentId?: string;
  audienceLabel?: string | null;
};

export function TeacherCourseAnnouncementCard({
  courseId,
  announcementId,
  category,
  title,
  body,
  authorName,
  createdAt,
  updatedAt,
  attachmentPath,
  attachmentName,
  canManage,
  postedByAdmin = false,
  enrollmentId,
  audienceLabel,
}: TeacherCourseAnnouncementCardProps) {
  const edited = updatedAt.getTime() - createdAt.getTime() > 1000;
  const preview = body.length > 160 ? `${body.slice(0, 160).trimEnd()}…` : body;
  const editHref = enrollmentId
    ? `/teacher/courses/${courseId}/students/${enrollmentId}/announcements/${announcementId}/edit`
    : `/teacher/courses/${courseId}/announcements/${announcementId}/edit`;

  return (
    <article className="card-elevated flex h-full flex-col overflow-hidden p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <AnnouncementCategoryBadge category={category} />
          {audienceLabel && (
            <span className="rounded-full bg-warning-bg px-2.5 py-0.5 text-xs font-medium text-warning-text">
              {audienceLabel}
            </span>
          )}
          {edited && <span className="text-xs text-muted">Edited</span>}
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-3">
            <Link href={editHref} className="text-sm font-medium text-primary hover:underline">
              Edit
            </Link>
            <DeleteAnnouncementButton
              courseId={courseId}
              announcementId={announcementId}
              enrollmentId={enrollmentId}
            />
          </div>
        )}
      </div>
      <h3 className="mt-3 line-clamp-2 font-serif text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 line-clamp-3 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-muted">
        {preview}
      </p>
      {attachmentPath && attachmentName && (
        <Link
          href={attachmentPath}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex truncate text-sm font-medium text-primary hover:underline"
        >
          {attachmentName}
        </Link>
      )}
      <p className="mt-3 text-xs text-muted">
        Posted by {authorName} · {formatAnnouncementDate(createdAt)}
      </p>
      {!canManage && postedByAdmin && (
        <p className="mt-2 text-xs text-muted">Posted by the academy administration</p>
      )}
    </article>
  );
}
