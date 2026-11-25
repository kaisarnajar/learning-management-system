import { NextRequest } from "next/server";
import { createSiteAnnouncement } from "@/app/admin/announcements/actions";
import { ADMIN_ROLES, pagedBody, readActionForm, staffAction, staffListParams, staffRead } from "@/services/api-staff";
import { MAX_ANNOUNCEMENT_IMAGES } from "@/services/site-announcement-limits";
import {
  getAllSiteAnnouncementsForAdminPaginated,
  getFeaturedHomepageAnnouncementCount,
  HOMEPAGE_FEATURED_ANNOUNCEMENTS_MAX,
  siteAnnouncementStatusBadge,
} from "@/services/site-announcements";

/** Site announcements, as on /admin/announcements (newest first; `q` searches title, location and body). */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/announcements", async () => {
    const { page, pageSize, q } = staffListParams(request);
    const [{ items, totalCount }, featuredCount] = await Promise.all([
      getAllSiteAnnouncementsForAdminPaginated(page, pageSize, q || undefined),
      getFeaturedHomepageAnnouncementCount(),
    ]);
    return {
      ...pagedBody(
        items.map((a) => ({
          id: a.id,
          title: a.title,
          eventDate: a.eventDate,
          location: a.location,
          published: a.published,
          showOnHomepage: a.showOnHomepage,
          statusLabel: siteAnnouncementStatusBadge(a.published, a.showOnHomepage).label,
          imageCount: a.images.length,
          thumbnail: a.images[0]?.imagePath ?? null,
          createdBy: a.createdBy?.name ?? null,
          createdAt: a.createdAt,
        })),
        totalCount,
        page,
        pageSize,
      ),
      featuredCount,
      featuredMax: HOMEPAGE_FEATURED_ANNOUNCEMENTS_MAX,
      maxImages: MAX_ANNOUNCEMENT_IMAGES,
    };
  });
}

/**
 * New announcement (multipart): title, body, eventDate (YYYY-MM-DD, optional), location, published ("on"),
 * showOnHomepage ("on"), images (files, repeated). A published one notifies every student.
 */
export async function POST(request: NextRequest) {
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/announcements POST", async () =>
    createSiteAnnouncement(await readActionForm(request)),
  );
}
