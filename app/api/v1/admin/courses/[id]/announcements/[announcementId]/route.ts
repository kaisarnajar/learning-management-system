import { NextRequest } from "next/server";
import { deleteAnnouncement, getAnnouncement, updateAnnouncement } from "@/services/api-course-tools";

type Params = { params: Promise<{ id: string; announcementId: string }> };

/** One announcement (PATCH multipart: category, title, body, attachment, removeAttachment=1). See services/api-course-tools.ts. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id, announcementId } = await params;
  return getAnnouncement(request, "admin", id, announcementId);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id, announcementId } = await params;
  return updateAnnouncement(request, "admin", id, announcementId);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id, announcementId } = await params;
  return deleteAnnouncement(request, "admin", id, announcementId);
}
