import { NextRequest } from "next/server";
import { getSiteAnnouncementById } from "@/services/site-announcements";
import { apiError, apiServerError, publicJson } from "@/utils/api-response";

/** One published site announcement with its images. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const announcement = await getSiteAnnouncementById(id);
    if (!announcement) return apiError("Announcement not found.", 404);
    return publicJson(request, { success: true, announcement });
  } catch (error) {
    return apiServerError("api/v1/announcements/[id]", error, "Failed to fetch the announcement.");
  }
}
