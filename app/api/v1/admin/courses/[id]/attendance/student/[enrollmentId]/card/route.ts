import { NextRequest } from "next/server";
import { studentCardPdf } from "@/services/api-course-tools";

type Params = { params: Promise<{ id: string; enrollmentId: string }> };

/** The student's attendance card PDF. See services/api-course-tools.ts. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id, enrollmentId } = await params;
  return studentCardPdf(request, id, enrollmentId, "attendance");
}
