import { NextRequest } from "next/server";
import { createGrade, listGrades } from "@/services/api-course-tools";

type Params = { params: Promise<{ id: string }> };

/** Grade cards (test reports); POST JSON `{ title, date, maxMarks, records: [{ enrollmentId, marksObtained | null }] }`. See services/api-course-tools.ts. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return listGrades(request, "admin", id);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return createGrade(request, "admin", id);
}
