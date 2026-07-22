"use server";

import { ensureAuth } from "@/utils/auth-utils";
import { isCourseEnrollmentOpen } from "@/services/course-status";
import { getRegistrationFeePaise } from "@/services/course-pricing";
import { getCourseById } from "@/services/courses";
import {
  AWAITING_ENROLLMENT_FEE,
  PENDING_ENROLLMENT_APPROVAL,
} from "@/services/enrollment-status";
import { isUserProfileComplete, PROFILE_COMPLETE_REDIRECT } from "@/services/profile";
import { prisma } from "@/utils/prisma";
import { isUpiConfigured } from "@/services/upi";

export async function submitCheckout(courseId: string) {
  const { session, error: authError } = await ensureAuth();

  if (authError || !session) {
    return { error: "Please sign in to enroll.", status: 401 };
  }
  if (!session.user.emailVerified) {
    return { error: "Please verify your email to enroll.", status: 403 };
  }

  if (typeof courseId !== "string") {
    return { error: "Invalid course.", status: 400 };
  }

  try {
    const course = await getCourseById(courseId);
    if (!course || !isCourseEnrollmentOpen(course.status)) {
      return { error: "This course is not open for enrollment.", status: 404 };
    }

    const enrollmentFeePaise = getRegistrationFeePaise(course);
    const requiresEnrollmentFee = enrollmentFeePaise > 0;

    if (requiresEnrollmentFee && !(await isUpiConfigured())) {
      return {
        error:
          "This course requires an enrollment fee, but online payments are not configured yet. Please contact the academy.",
        status: 503,
      };
    }

    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId: session.user.id, courseId },
      },
    });

    if (existing?.status === "active" || existing?.status === "completed") {
      return {
        error: "You are already enrolled in this course.",
        alreadyEnrolled: true,
        status: 400,
      };
    }

    if (existing?.status === PENDING_ENROLLMENT_APPROVAL) {
      return {
        redirectUrl: "/profile/courses",
        alreadyEnrolled: true,
      };
    }

    if (existing?.status === AWAITING_ENROLLMENT_FEE) {
      return {
        redirectUrl: `/profile/courses/${courseId}/enrollment-pay`,
        alreadyEnrolled: true,
      };
    }

    if (existing) {
      return {
        redirectUrl: "/profile/courses",
        alreadyEnrolled: true,
      };
    }

    const profileComplete = await isUserProfileComplete(session.user.id);
    if (!profileComplete) {
      return {
        error: "Please complete your profile before enrolling in a course.",
        profileIncomplete: true,
        redirectUrl: PROFILE_COMPLETE_REDIRECT,
        status: 403,
      };
    }

    if (requiresEnrollmentFee) {
      if (!existing) {
        await prisma.enrollment.create({
          data: {
            userId: session.user.id,
            courseId: course.id,
            status: AWAITING_ENROLLMENT_FEE,
          },
        });
      }
      return {
        redirectUrl: `/profile/courses/${courseId}/enrollment-pay`,
      };
    }

    // Free course: create enrollment immediately and await admin approval.
    await prisma.enrollment.create({
      data: {
        userId: session.user.id,
        courseId: course.id,
        status: PENDING_ENROLLMENT_APPROVAL,
      },
    });

    return { redirectUrl: "/profile/courses" };
  } catch (error) {
    console.error("Caught error:", error);
    return { error: "Could not submit enrollment request. Please try again.", status: 500 };
  }
}
