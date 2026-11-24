import { NextRequest } from "next/server";
import { getStudentAttendance } from "@/services/api-course-tools";

type Params = { params: Promise<{ id: string; enrollmentId: string }> };

/** A student's attendance report. See services/api-course-tools.ts. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id, enrollmentId } = await params;
  return getStudentAttendance(request, "admin", id, enrollmentId);
}
