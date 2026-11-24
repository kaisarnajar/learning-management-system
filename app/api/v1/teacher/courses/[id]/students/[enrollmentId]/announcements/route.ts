import { NextRequest } from "next/server";
import { createAnnouncement, listAnnouncements } from "@/services/api-course-tools";

type Params = { params: Promise<{ id: string; enrollmentId: string }> };

/** Private messages to one student (GET: `page`; POST multipart as for course announcements). See services/api-course-tools.ts. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id, enrollmentId } = await params;
  return listAnnouncements(request, "teacher", id, enrollmentId);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id, enrollmentId } = await params;
  return createAnnouncement(request, "teacher", id, enrollmentId);
}
