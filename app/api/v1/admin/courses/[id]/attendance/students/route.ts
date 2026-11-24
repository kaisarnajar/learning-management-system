import { NextRequest } from "next/server";
import { listGradableStudents } from "@/services/api-course-tools";

type Params = { params: Promise<{ id: string }> };

/** Active students, for marking attendance. See services/api-course-tools.ts. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return listGradableStudents(request, "admin", id, "attendance");
}
