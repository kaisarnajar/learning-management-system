import { NextRequest, NextResponse } from "next/server";
import { getPublicCourseById } from "@/services/courses";
import { prisma } from "@/utils/prisma";

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

    // Fetch announcements for this course
    const announcements = await prisma.courseAnnouncement.findMany({
      where: { courseId: id, enrollmentId: null },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

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
