import { NextRequest } from "next/server";
import { getStudentGrades } from "@/services/api-course-tools";

type Params = { params: Promise<{ id: string; enrollmentId: string }> };

/** A student's grade report. See services/api-course-tools.ts. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id, enrollmentId } = await params;
  return getStudentGrades(request, "teacher", id, enrollmentId);
}
