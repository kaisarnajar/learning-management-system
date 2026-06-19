import { TrackedLink } from "@/components/analytics/TrackedLink";
import { SiteAnnouncementCard } from "@/components/announcements/SiteAnnouncementCard";
import { SplitSectionTitle } from "@/components/site/SplitSectionTitle";
import {
  getHomepageSiteAnnouncements,
  HOMEPAGE_FEATURED_ANNOUNCEMENTS_MAX,
} from "@/lib/site-announcements";

export async function HomeAnnouncements() {
  const announcements = await getHomepageSiteAnnouncements(HOMEPAGE_FEATURED_ANNOUNCEMENTS_MAX);

  if (announcements.length === 0) {
    return null;
  }

  return (
    <section className="pattern-islamic py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-end">
          <div className="text-center sm:text-left">
            <SplitSectionTitle muted="Academy" accent="Announcements" />
            <p className="mt-3 max-w-xl text-sm text-muted sm:text-base">
              Events, visits, and important updates from Darse Quran Academy.
            </p>
          </div>
          <TrackedLink href="/announcements" eventName="View All Announcements" pageName="/" className="btn-gold-solid inline-flex px-8 py-3 text-sm">
            View all
          </TrackedLink>
        </div>
        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {announcements.map((announcement) => (
            <li key={announcement.id}>
              <SiteAnnouncementCard announcement={announcement} compact />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
