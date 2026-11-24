import { NextRequest } from "next/server";
import { listAttendance } from "@/services/api-course-tools";

type Params = { params: Promise<{ id: string }> };

/** Attendance history of the course. See services/api-course-tools.ts. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return listAttendance(request, "teacher", id);
}
