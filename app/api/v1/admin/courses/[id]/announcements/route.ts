import { NextRequest } from "next/server";
import { createAnnouncement, listAnnouncements } from "@/services/api-course-tools";

type Params = { params: Promise<{ id: string }> };

/** Course-wide announcements (GET: `page`, `q`; POST multipart: category, title, body, attachment). See services/api-course-tools.ts. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return listAnnouncements(request, "admin", id);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return createAnnouncement(request, "admin", id);
}
