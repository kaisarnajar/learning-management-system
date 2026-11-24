"use server";

import { ensureAuth } from "@/utils/auth-utils";
import { requestEnrollment } from "@/services/enrollments";
import { PROFILE_COMPLETE_REDIRECT } from "@/utils/profile-format";

/**
 * The website's "Enrol" button: signs the student in, runs requestEnrollment
 * (services/enrollments.ts, shared with POST /api/v1/enrollments) and answers
 * where the page should go next.
 */
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
    const result = await requestEnrollment(session.user.id, courseId);
    if (result.ok) {
      // A course with a fee goes to payment; a free one awaits the admin's approval.
      return { redirectUrl: result.requiresEnrollmentFee ? `/profile/courses/${courseId}/enrollment-pay` : "/profile/courses" };
    }

    switch (result.reason) {
      case "COURSE_NOT_OPEN":
        return { error: "This course is not open for enrollment.", status: 404 };
      case "ALREADY_REQUESTED":
        if (result.status === "ACTIVE" || result.status === "COMPLETED") {
          return { error: "You are already enrolled in this course.", alreadyEnrolled: true, status: 400 };
        }
        if (result.status === "AWAITING_ENROLLMENT_FEE") {
          return { redirectUrl: `/profile/courses/${courseId}/enrollment-pay`, alreadyEnrolled: true };
        }
        return { redirectUrl: "/profile/courses", alreadyEnrolled: true };
      case "PROFILE_INCOMPLETE":
        return {
          error: "Please complete your profile before enrolling in a course.",
          profileIncomplete: true,
          redirectUrl: PROFILE_COMPLETE_REDIRECT,
          status: 403,
        };
      case "PAYMENTS_NOT_CONFIGURED":
        return {
          error:
            "This course requires an enrollment fee, but online payments are not configured yet. Please contact the academy.",
          status: 503,
        };
    }
  } catch (error) {
    console.error("Caught error:", error);
    return { error: "Could not submit enrollment request. Please try again.", status: 500 };
  }
}
