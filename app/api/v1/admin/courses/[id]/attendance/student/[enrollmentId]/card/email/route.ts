import { NextRequest } from "next/server";
import { emailStudentCard } from "@/services/api-course-tools";

type Params = { params: Promise<{ id: string; enrollmentId: string }> };

/** E-mails the attendance card PDF to the student. See services/api-course-tools.ts. */
export async function POST(request: NextRequest, { params }: Params) {
  const { id, enrollmentId } = await params;
  return emailStudentCard(request, id, enrollmentId, "attendance");
}
