import { TrackedLink } from "@/components/analytics/TrackedLink";
import type { SiteAnnouncementPublic } from "@/lib/site-announcements";
import { formatSiteAnnouncementDate } from "@/lib/site-announcements";

type SiteAnnouncementCardProps = {
  announcement: SiteAnnouncementPublic;
  compact?: boolean;
};

export function SiteAnnouncementCard({ announcement, compact = false }: SiteAnnouncementCardProps) {
  return (
    <article className="card-elevated flex h-full flex-col overflow-hidden">
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {(announcement.eventDate || announcement.location) && (
          <div className="text-xs font-semibold uppercase tracking-wide text-gold">
            {announcement.eventDate && <p>{announcement.eventDate}</p>}
            {announcement.location && (
              <p className={announcement.eventDate ? "mt-1" : undefined}>{announcement.location}</p>
            )}
          </div>
        )}
        <h3
          className={`line-clamp-2 font-serif font-semibold text-foreground ${compact ? "mt-2 text-lg" : "mt-2 text-xl"}`}
        >
          {announcement.title}
        </h3>
        <p className={`mt-3 text-muted ${compact ? "line-clamp-3 text-sm" : "line-clamp-4 text-sm leading-relaxed"}`}>
          {announcement.body}
        </p>
        <div className="mt-auto pt-4">
          <p className="text-xs text-muted">
            Posted {formatSiteAnnouncementDate(announcement.createdAt)}
          </p>
          <TrackedLink
            href={`/announcements/${announcement.id}`}
            eventName="Read Announcement"
            pageName="/announcements"
            className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
          >
            Read more
          </TrackedLink>
        </div>
      </div>
    </article>
  );
}
