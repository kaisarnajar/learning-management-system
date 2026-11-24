import { NextRequest } from "next/server";
import { toggleSiteAnnouncementHomepage } from "@/app/admin/announcements/actions";
import { ADMIN_ROLES, staffAction } from "@/services/api-staff";
import { NOT_FOUND_CODE, withErrorCodes } from "@/services/api-content";

type Params = { params: Promise<{ id: string }> };

/** Features a published announcement on the homepage, or takes it off (the list's homepage button). */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/announcements/[id]/homepage", () =>
    withErrorCodes(() => toggleSiteAnnouncementHomepage(id), NOT_FOUND_CODE("Announcement")),
  );
}
