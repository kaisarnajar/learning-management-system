import { NextRequest } from "next/server";
import { deleteAttendanceDay, getAttendanceDay, saveAttendanceDay } from "@/services/api-course-tools";

type Params = { params: Promise<{ id: string; date: string }> };

/** One day (YYYY-MM-DD) of attendance; PUT JSON `{ records: [{ enrollmentId, isPresent }] }` creates or replaces it. See services/api-course-tools.ts. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id, date } = await params;
  return getAttendanceDay(request, "teacher", id, date);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id, date } = await params;
  return saveAttendanceDay(request, "teacher", id, date);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id, date } = await params;
  return deleteAttendanceDay(request, "teacher", id, date);
}
