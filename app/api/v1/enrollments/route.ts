import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth, requireVerifiedEmail } from "@/services/api-auth";
import { toEnrollmentDto } from "@/services/api-dto";
import { prisma } from "@/utils/prisma";
import { requestEnrollment } from "@/services/enrollments";

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
        course: { include: { teacher: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = enrollments.map((e) => toEnrollmentDto(e, e.course));

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
  const unverified = requireVerifiedEmail(user, "enroll in a course");
  if (unverified) return unverified;

  try {
    const body = await request.json();
    const courseId = typeof body.courseId === "string" ? body.courseId.trim() : "";

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: "Course ID is required." },
        { status: 400 }
      );
    }

    // The checks and their order are shared with the website (services/enrollments.ts).
    const result = await requestEnrollment(user.id, courseId);
    if (result.ok) {
      return NextResponse.json({
        success: true,
        enrollment: result.enrollment,
        requiresEnrollmentFee: result.requiresEnrollmentFee,
        feeAmountPaise: result.feeAmountPaise,
      });
    }

    switch (result.reason) {
      case "COURSE_NOT_OPEN":
        return NextResponse.json(
          { success: false, error: "This course is not open for enrollment." },
          { status: 400 }
        );
      case "ALREADY_REQUESTED":
        return NextResponse.json({
          success: true,
          alreadyEnrolled: true,
          status: result.enrollment.status,
          enrollment: result.enrollment,
        });
      case "PROFILE_INCOMPLETE":
        return NextResponse.json(
          {
            success: false,
            error: "Please complete your profile before enrolling in a course.",
            profileIncomplete: true,
          },
          { status: 403 }
        );
      case "PAYMENTS_NOT_CONFIGURED":
        return NextResponse.json(
          { success: false, error: "Online payment is not configured yet. Please contact the academy." },
          { status: 503 }
        );
    }
  } catch (error) {
    console.error("[api/v1/enrollments] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit enrollment request." },
      { status: 500 }
    );
  }
}
