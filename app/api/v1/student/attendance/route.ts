import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { prisma } from "@/utils/prisma";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = request.nextUrl;
    const courseId = searchParams.get("courseId") || undefined;

    // Find student enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: user.id,
        courseId: courseId ? courseId : undefined,
      },
      // One query: the records come with their enrollment instead of one
      // round trip per course.
      select: {
        id: true,
        courseId: true,
        rollNumber: true,
        attendanceRecords: {
          select: { id: true, isPresent: true, attendance: { select: { date: true } } },
          orderBy: { attendance: { date: "desc" } },
        },
      },
    });

    const results = enrollments.map((e) => {
        const records = e.attendanceRecords;
        const total = records.length;
        const presentCount = records.filter((r) => r.isPresent).length;

        return {
          enrollmentId: e.id,
          courseId: e.courseId,
          rollNumber: e.rollNumber,
          totalClasses: total,
          presentClasses: presentCount,
          absentClasses: total - presentCount,
          percentage: total > 0 ? Math.round((presentCount / total) * 100) : 0,
          records: records.map((r) => ({
            id: r.id,
            date: r.attendance.date,
            isPresent: r.isPresent,
          })),
        };
    });

    return NextResponse.json({
      success: true,
      attendance: results,
    });
  } catch (error) {
    console.error("[api/v1/student/attendance] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch attendance records." },
      { status: 500 }
    );
  }
}
