import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { getStudentGradeRecordsFromDb } from "@/services/grades";
import { prisma } from "@/utils/prisma";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = request.nextUrl;
    const courseId = searchParams.get("courseId") || undefined;

    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: user.id,
        courseId: courseId ? courseId : undefined,
      },
      select: {
        id: true,
        courseId: true,
        rollNumber: true,
      },
    });

    const results = await Promise.all(
      enrollments.map(async (e) => {
        const records = await getStudentGradeRecordsFromDb(e.id);
        const totalMaxMarks = records.reduce((sum, r) => sum + r.grade.maxMarks, 0);
        const totalMarksObtained = records.reduce((sum, r) => sum + r.marksObtained, 0);

        return {
          enrollmentId: e.id,
          courseId: e.courseId,
          rollNumber: e.rollNumber,
          totalMaxMarks,
          totalMarksObtained,
          overallPercentage: totalMaxMarks > 0 ? Math.round((totalMarksObtained / totalMaxMarks) * 100) : 0,
          grades: records.map((r) => ({
            id: r.id,
            title: r.grade.title,
            date: r.grade.date,
            maxMarks: r.grade.maxMarks,
            marksObtained: r.marksObtained,
            percentage: r.grade.maxMarks > 0 ? Math.round((r.marksObtained / r.grade.maxMarks) * 100) : 0,
          })),
        };
      })
    );

    return NextResponse.json({
      success: true,
      grades: results,
    });
  } catch (error) {
    console.error("[api/v1/student/grades] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch student grades." },
      { status: 500 }
    );
  }
}
