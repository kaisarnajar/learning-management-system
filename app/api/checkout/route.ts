import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isCourseEnrollmentOpen } from "@/lib/course-status";
import { getRegistrationFeePaise } from "@/lib/course-pricing";
import { getCourseById } from "@/lib/courses";
import {
  AWAITING_ENROLLMENT_FEE,
  PENDING_ENROLLMENT_APPROVAL,
} from "@/lib/enrollment-status";
import { isUserProfileComplete, PROFILE_COMPLETE_REDIRECT } from "@/lib/profile";
import { prisma } from "@/lib/prisma";
import { isUpiConfigured } from "@/lib/upi";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in to enroll." }, { status: 401 });
  }

  try {
    const { courseId } = await request.json();

    if (typeof courseId !== "string") {
      return NextResponse.json({ error: "Invalid course." }, { status: 400 });
    }

    const course = await getCourseById(courseId);
    if (!course || !isCourseEnrollmentOpen(course.status)) {
      return NextResponse.json(
        { error: "This course is not open for enrollment." },
        { status: 404 },
      );
    }

    const enrollmentFeePaise = getRegistrationFeePaise(course);
    const requiresEnrollmentFee = enrollmentFeePaise > 0;

    if (requiresEnrollmentFee && !(await isUpiConfigured())) {
      return NextResponse.json(
        {
          error:
            "This course requires an enrollment fee, but online payments are not configured yet. Please contact the academy.",
        },
        { status: 503 },
      );
    }

    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId: session.user.id, courseId },
      },
    });

    if (existing?.status === "active" || existing?.status === "completed") {
      return NextResponse.json(
        {
          error: "You are already enrolled in this course.",
          alreadyEnrolled: true,
        },
        { status: 400 },
      );
    }

    if (existing?.status === PENDING_ENROLLMENT_APPROVAL) {
      return NextResponse.json({
        redirectUrl: "/profile/courses",
        alreadyEnrolled: true,
      });
    }

    if (existing?.status === AWAITING_ENROLLMENT_FEE) {
      return NextResponse.json({
        redirectUrl: `/profile/courses/${courseId}/enrollment-pay`,
        alreadyEnrolled: true,
      });
    }

    if (existing) {
      return NextResponse.json({
        redirectUrl: "/profile/courses",
        alreadyEnrolled: true,
      });
    }

    const profileComplete = await isUserProfileComplete(session.user.id);
    if (!profileComplete) {
      return NextResponse.json(
        {
          error: "Please complete your profile before enrolling in a course.",
          profileIncomplete: true,
          redirectUrl: PROFILE_COMPLETE_REDIRECT,
        },
        { status: 403 },
      );
    }

    const status = requiresEnrollmentFee ? AWAITING_ENROLLMENT_FEE : PENDING_ENROLLMENT_APPROVAL;

    await prisma.enrollment.create({
      data: {
        userId: session.user.id,
        courseId: course.id,
        status,
      },
    });

    return NextResponse.json({
      redirectUrl: requiresEnrollmentFee
        ? `/profile/courses/${courseId}/enrollment-pay`
        : "/profile/courses",
    });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT")) { throw error; }
    console.error("Caught error:", error);
    return NextResponse.json({ error: "Could not submit enrollment request. Please try again." }, { status: 500 });
    }
}
