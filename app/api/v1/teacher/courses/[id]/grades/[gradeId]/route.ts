import { NextRequest } from "next/server";
import { deleteGrade, getGrade, updateGrade } from "@/services/api-course-tools";

type Params = { params: Promise<{ id: string; gradeId: string }> };

/** One grade card; PUT takes the same JSON as POST ../grades. See services/api-course-tools.ts. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id, gradeId } = await params;
  return getGrade(request, "teacher", id, gradeId);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id, gradeId } = await params;
  return updateGrade(request, "teacher", id, gradeId);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id, gradeId } = await params;
  return deleteGrade(request, "teacher", id, gradeId);
}
