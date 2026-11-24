import { NextRequest } from "next/server";
import { deleteAnnouncement, getAnnouncement, updateAnnouncement } from "@/services/api-course-tools";

type Params = { params: Promise<{ id: string; enrollmentId: string; announcementId: string }> };

/** One private message to a student. See services/api-course-tools.ts. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id, enrollmentId, announcementId } = await params;
  return getAnnouncement(request, "teacher", id, announcementId, enrollmentId);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id, enrollmentId, announcementId } = await params;
  return updateAnnouncement(request, "teacher", id, announcementId, enrollmentId);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id, enrollmentId, announcementId } = await params;
  return deleteAnnouncement(request, "teacher", id, announcementId, enrollmentId);
}
