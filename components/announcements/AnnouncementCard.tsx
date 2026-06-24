import type { AnnouncementCategory } from "@prisma/client";
import { AnnouncementAttachment } from "@/components/announcements/AnnouncementAttachment";
import { AnnouncementCategoryBadge } from "@/components/announcements/AnnouncementCategoryBadge";
import { formatAnnouncementDate } from "@/lib/announcements";

type AnnouncementCardProps = {
  category: AnnouncementCategory;
  title: string;
  body: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
  attachmentPath?: string | null;
  attachmentName?: string | null;
  /** e.g. "For you only" on the student feed, or the student name on the teacher feed. */
  audienceLabel?: string | null;
};

export function AnnouncementCard({
  category,
  title,
  body,
  authorName,
  createdAt,
  updatedAt,
  attachmentPath,
  attachmentName,
  audienceLabel,
}: AnnouncementCardProps) {
  const edited = updatedAt.getTime() - createdAt.getTime() > 1000;

  return (
    <article className="flex h-full flex-col rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <AnnouncementCategoryBadge category={category} />
        {audienceLabel && (
          <span className="rounded-full bg-warning-bg px-2.5 py-0.5 text-xs font-medium text-warning-text">
            {audienceLabel}
          </span>
        )}
        {edited && <span className="text-xs text-muted">Edited</span>}
      </div>
      <h3 className="mt-3 font-serif text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground line-clamp-4">{body}</p>
      {attachmentPath && attachmentName && (
        <AnnouncementAttachment attachmentPath={attachmentPath} attachmentName={attachmentName} />
      )}
      <p className="mt-auto pt-4 text-xs text-muted">
        Posted by {authorName} · {formatAnnouncementDate(createdAt)}
      </p>
    </article>
  );
}
