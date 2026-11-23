import { NextRequest, NextResponse } from "next/server";
import { getSiteAnnouncementById } from "@/services/site-announcements";
import { apiError, apiServerError } from "@/utils/api-response";

/** One published site announcement with its images. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const announcement = await getSiteAnnouncementById(id);
    if (!announcement) return apiError("Announcement not found.", 404);
    return NextResponse.json({ success: true, announcement });
  } catch (error) {
    return apiServerError("api/v1/announcements/[id]", error, "Failed to fetch the announcement.");
  }
}
