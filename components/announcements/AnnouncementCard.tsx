import type { ReactNode } from "react";
import type { AnnouncementCategory } from "@prisma/client";
import Link from "next/link";
import { AnnouncementAttachment } from "@/components/announcements/AnnouncementAttachment";
import { AnnouncementCategoryBadge } from "@/components/announcements/AnnouncementCategoryBadge";
import { formatAnnouncementDate } from "@/services/announcements";
import { ViewAnnouncementModal } from "@/components/announcements/ViewAnnouncementModal";

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
  /** `feed` is the student-facing card; `manage` is the compact admin/teacher card. */
  variant?: "feed" | "manage";
  /** Edit/delete controls, rendered top-right. */
  actions?: ReactNode;
  /** Extra line under the byline (manage variant). */
  footerNote?: ReactNode;
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
  variant = "feed",
  actions,
  footerNote,
}: AnnouncementCardProps) {
  const edited = updatedAt.getTime() - createdAt.getTime() > 1000;
  const manage = variant === "manage";
  const preview = body.length > 160 ? `${body.slice(0, 160).trimEnd()}…` : body;

  const badges = (
    <>
      <AnnouncementCategoryBadge category={category} />
      {audienceLabel && (
        <span className="rounded-full bg-warning-bg px-2.5 py-0.5 text-xs font-medium text-warning-text">
          {audienceLabel}
        </span>
      )}
      {edited && <span className="text-xs text-muted">Edited</span>}
    </>
  );

  const byline = (
    <p className="line-clamp-1 text-xs text-muted">
      Posted by {authorName} · {formatAnnouncementDate(createdAt)}
    </p>
  );

  if (manage) {
    return (
      <article className="card-elevated flex h-full flex-col overflow-hidden p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">{badges}</div>
          {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
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
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-4">
          <div className="min-w-0">
            {byline}
            {footerNote && <p className="mt-1 line-clamp-1 text-xs text-muted">{footerNote}</p>}
          </div>
          <ViewAnnouncementModal title={title} body={body} />
        </div>
      </article>
    );
  }

  return (
    <article className="flex h-full flex-col rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {badges}
        {actions && <div className="ml-auto flex shrink-0 items-center gap-3">{actions}</div>}
      </div>
      <h3 className="mt-3 font-serif text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground line-clamp-4">{body}</p>
      {attachmentPath && attachmentName && (
        <AnnouncementAttachment attachmentPath={attachmentPath} attachmentName={attachmentName} />
      )}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-4">
        {byline}
        <ViewAnnouncementModal title={title} body={body} />
      </div>
    </article>
  );
}
