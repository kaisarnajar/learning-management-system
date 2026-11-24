import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { deleteSiteAnnouncement, updateSiteAnnouncement } from "@/app/admin/announcements/actions";
import { ADMIN_ROLES, readActionForm, staffAction, staffRead } from "@/services/api-staff";
import { imageRows, NOT_FOUND_CODE, withErrorCodes } from "@/services/api-content";
import { MAX_ANNOUNCEMENT_IMAGES } from "@/services/site-announcement-upload";
import {
  getFeaturedHomepageAnnouncementCount,
  getSiteAnnouncementForAdmin,
  HOMEPAGE_FEATURED_ANNOUNCEMENTS_MAX,
  siteAnnouncementStatusBadge,
} from "@/services/site-announcements";
import { getFormDateInputValue } from "@/utils/form-date";

type Params = { params: Promise<{ id: string }> };

const CODES = NOT_FOUND_CODE("Announcement");

/** One announcement with its images, as /admin/announcements/[id]/edit loads it (drafts included). */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/announcements/[id]", async () => {
    const [a, featuredCount] = await Promise.all([getSiteAnnouncementForAdmin(id), getFeaturedHomepageAnnouncementCount()]);
    if (!a) notFound();
    return {
      announcement: {
        id: a.id,
        title: a.title,
        body: a.body,
        eventDate: a.eventDate,
        eventDateInput: getFormDateInputValue(a.eventDate) || null,
        location: a.location,
        published: a.published,
        showOnHomepage: a.showOnHomepage,
        statusLabel: siteAnnouncementStatusBadge(a.published, a.showOnHomepage).label,
        images: imageRows(a.images),
        createdBy: a.createdBy?.name ?? null,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        publicPath: `/announcements/${a.id}`,
      },
      featuredCount,
      featuredMax: HOMEPAGE_FEATURED_ANNOUNCEMENTS_MAX,
      maxImages: MAX_ANNOUNCEMENT_IMAGES,
    };
  });
}

/** Edit (multipart): the create fields, plus removeImage (image ids, repeated) and more images. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/announcements/[id] PATCH", async () => {
    const form = await readActionForm(request);
    return withErrorCodes(() => updateSiteAnnouncement(id, form), CODES);
  });
}

/** Deletes the announcement and its images. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/announcements/[id] DELETE", () =>
    withErrorCodes(() => deleteSiteAnnouncement(id), CODES),
  );
}
