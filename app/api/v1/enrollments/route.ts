import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth, requireVerifiedEmail } from "@/services/api-auth";
import { toEnrollmentDto } from "@/services/api-dto";
import { prisma } from "@/utils/prisma";
import { requestEnrollment } from "@/services/enrollments";
import { apiError, apiServerError, INVALID_JSON_MESSAGE, readJson } from "@/utils/api-response";

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
    return apiServerError("api/v1/enrollments", error, "Failed to fetch enrollments.");
  }
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;
  const unverified = requireVerifiedEmail(user, "enroll in a course");
  if (unverified) return unverified;

  try {
    const body = await readJson(request);
    if (!body) return apiError(INVALID_JSON_MESSAGE, 400);
    const courseId = typeof body.courseId === "string" ? body.courseId.trim() : "";

    if (!courseId) {
      return apiError("Course ID is required.", 400);
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
        return apiError("This course is not open for enrollment.", 400);
      case "ALREADY_REQUESTED":
        return NextResponse.json({
          success: true,
          alreadyEnrolled: true,
          status: result.enrollment.status,
          enrollment: result.enrollment,
        });
      case "PROFILE_INCOMPLETE":
        return apiError("Please complete your profile before enrolling in a course.", 403, {
          extra: { profileIncomplete: true },
        });
      case "PAYMENTS_NOT_CONFIGURED":
        return apiError("Online payment is not configured yet. Please contact the academy.", 503);
    }
  } catch (error) {
    return apiServerError("api/v1/enrollments", error, "Failed to submit enrollment request.");
  }
}
