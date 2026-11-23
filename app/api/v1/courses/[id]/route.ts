import { NextRequest, NextResponse } from "next/server";
import { getPublicCourseById } from "@/services/courses";
import { prisma } from "@/utils/prisma";
import { authenticateApiRequest } from "@/services/api-auth";
import { toPublicCourseDto } from "@/services/api-dto";
import { hasCourseContentAccess } from "@/services/enrollment-status";
import { isCourseEnrollmentOpen } from "@/services/course-status";
import { hasPendingEnrollmentFeeSubmission } from "@/services/monthly-payments";

/**
 * A public course. With a Bearer token the response also carries the
 * caller's own enrollment (so the app can show Enroll / Pay / Open) and, for
 * an approved enrollment, the latest course-wide announcements.
 */
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
    // pending, awaiting-fee and rejected applicants receive an empty list.
    let announcements: Awaited<ReturnType<typeof prisma.courseAnnouncement.findMany>> = [];
    let enrollment: { id: string; status: string; rollNumber: number | null; enrollmentFeePending: boolean } | null = null;
    const { user } = await authenticateApiRequest(request);
    if (user) {
      const row = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: id } },
        select: { id: true, status: true, rollNumber: true },
      });
      if (row) {
        enrollment = {
          ...row,
          enrollmentFeePending: await hasPendingEnrollmentFeeSubmission(user.id, id),
        };
      }
      if (row && hasCourseContentAccess(row.status)) {
        announcements = await prisma.courseAnnouncement.findMany({
          where: { courseId: id, enrollmentId: null },
          orderBy: { createdAt: "desc" },
          take: 10,
        });
      }
    }

    return NextResponse.json({
      success: true,
      course: toPublicCourseDto(course),
      enrollmentOpen: isCourseEnrollmentOpen(course.status),
      enrollment,
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
