import type { AnnouncementCategory } from "@prisma/client";
import Link from "next/link";
import { AnnouncementCategoryBadge } from "@/components/announcements/AnnouncementCategoryBadge";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { formatAnnouncementDate } from "@/lib/announcements";

type AdminCourseAnnouncementCardProps = {
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
  deleteAction: (courseId: string, announcementId: string) => Promise<void>;
};

import { adminActionButtonClassName } from "@/lib/form";

export function AdminCourseAnnouncementCard({
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
  deleteAction,
}: AdminCourseAnnouncementCardProps) {
  const edited = updatedAt.getTime() - createdAt.getTime() > 1000;
  const preview = body.length > 160 ? `${body.slice(0, 160).trimEnd()}…` : body;

  return (
    <article className="card-elevated flex h-full flex-col overflow-hidden p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <AnnouncementCategoryBadge category={category} />
          {edited && <span className="text-xs text-muted">Edited</span>}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href={`/admin/courses/${courseId}/announcements/${announcementId}/edit`}
            className={adminActionButtonClassName}
          >
            Edit
          </Link>
          <DeleteActionButton
            action={deleteAction.bind(null, courseId, announcementId)}
            itemName="announcement"
          />
        </div>
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
    </article>
  );
}
