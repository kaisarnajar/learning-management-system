import { NextRequest, NextResponse } from "next/server";
import { getPublicCourseById } from "@/services/courses";
import { prisma } from "@/utils/prisma";
import { authenticateApiRequest } from "@/services/api-auth";
import { AWAITING_ENROLLMENT_FEE, PENDING_ENROLLMENT_APPROVAL } from "@/services/enrollment-status";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const course = await getPublicCourseById(id);

    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found." },
        { status: 404 }
      );
    }

    // Course-wide announcements are only for students whose enrollment has
    // been approved (same rule as the web portal). Anonymous callers and
    // pending applicants receive an empty list.
    let announcements: Awaited<ReturnType<typeof prisma.courseAnnouncement.findMany>> = [];
    const { user } = await authenticateApiRequest(request);
    if (user) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: id } },
        select: { status: true },
      });
      if (enrollment && enrollment.status !== PENDING_ENROLLMENT_APPROVAL && enrollment.status !== AWAITING_ENROLLMENT_FEE) {
        announcements = await prisma.courseAnnouncement.findMany({
          where: { courseId: id, enrollmentId: null },
          orderBy: { createdAt: "desc" },
          take: 10,
        });
      }
    }

    return NextResponse.json({
      success: true,
      course,
      announcements,
    });
  } catch (error) {
    console.error("[api/v1/courses/[id]] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch course details." },
      { status: 500 }
    );
  }
}
