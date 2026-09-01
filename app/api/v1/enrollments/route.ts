import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { prisma } from "@/utils/prisma";
import { getCourseById } from "@/services/courses";
import { isCourseEnrollmentOpen } from "@/services/course-status";
import { getRegistrationFeePaise } from "@/services/course-pricing";
import { AWAITING_ENROLLMENT_FEE, PENDING_ENROLLMENT_APPROVAL } from "@/services/enrollment-status";
import { isUserProfileComplete } from "@/services/profile";
import { isUpiConfigured } from "@/services/upi";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, registrationNumber: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch course details for each enrollment
    const courseIds = enrollments.map((e) => e.courseId);
    const courses = await prisma.course.findMany({
      where: { id: { in: courseIds } },
      include: { teacher: true },
    });
    const courseMap = new Map(courses.map((c) => [c.id, c]));

    const items = enrollments.map((e) => ({
      ...e,
      course: courseMap.get(e.courseId) || null,
    }));

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error("[api/v1/enrollments] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch enrollments." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const courseId = typeof body.courseId === "string" ? body.courseId.trim() : "";

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: "Course ID is required." },
        { status: 400 }
      );
    }

    const course = await getCourseById(courseId);
    if (!course || !isCourseEnrollmentOpen(course.status)) {
      return NextResponse.json(
        { success: false, error: "This course is not open for enrollment." },
        { status: 400 }
      );
    }

    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId: user.id, courseId },
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyEnrolled: true,
        status: existing.status,
        enrollment: existing,
      });
    }

    const profileComplete = await isUserProfileComplete(user.id);
    if (!profileComplete) {
      return NextResponse.json(
        {
          success: false,
          error: "Please complete your profile before enrolling in a course.",
          profileIncomplete: true,
        },
        { status: 403 }
      );
    }

    const enrollmentFeePaise = getRegistrationFeePaise(course);
    const requiresEnrollmentFee = enrollmentFeePaise > 0;

    if (requiresEnrollmentFee && !(await isUpiConfigured())) {
      return NextResponse.json(
        { success: false, error: "Online payment is not configured yet. Please contact the academy." },
        { status: 503 }
      );
    }

    const newStatus = requiresEnrollmentFee ? AWAITING_ENROLLMENT_FEE : PENDING_ENROLLMENT_APPROVAL;

    const enrollment = await prisma.enrollment.create({
      data: {
        userId: user.id,
        courseId: course.id,
        status: newStatus,
      },
    });

    return NextResponse.json({
      success: true,
      enrollment,
      requiresEnrollmentFee,
      feeAmountPaise: enrollmentFeePaise,
    });
  } catch (error) {
    console.error("[api/v1/enrollments] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit enrollment request." },
      { status: 500 }
    );
  }
}
