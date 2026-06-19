"use client";

import type { CourseStatus } from "@prisma/client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { trackButtonClick } from "@/lib/analytics-client";
import { getCourseEnrollmentClosedMessage } from "@/lib/course-status";
import {
  AWAITING_ENROLLMENT_FEE,
  PENDING_ENROLLMENT_APPROVAL,
} from "@/lib/enrollment-status";
import { PROFILE_COMPLETE_REDIRECT } from "@/lib/profile";

type CourseEnrollButtonProps = {
  courseId: string;
  courseStatus: CourseStatus;
  isEnrolled?: boolean;
  enrollmentStatus?: string | null;
  enrollmentId?: string | null;
  profileComplete?: boolean;
  hasPendingEnrollmentPayment?: boolean;
};

export function CourseEnrollButton({
  courseId,
  courseStatus,
  isEnrolled = false,
  enrollmentStatus = null,
  enrollmentId = null,
  profileComplete = true,
  hasPendingEnrollmentPayment = false,
}: CourseEnrollButtonProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const enrollmentClosedMessage = getCourseEnrollmentClosedMessage(courseStatus);
  const enrollmentPayHref = `/profile/courses/${courseId}/enrollment-pay`;

  if (enrollmentStatus === "completed" && enrollmentId) {
    return (
      <div className="mt-4">
        <Link
          href="/profile/courses"
          className="flex min-h-11 w-full items-center justify-center rounded-full border border-primary bg-primary/5 px-4 py-3 text-sm font-medium text-primary"
        >
          Completed — View My Courses
        </Link>
      </div>
    );
  }

  if (isEnrolled) {
    return (
      <div className="mt-4">
        <Link
          href="/profile/courses"
          className="flex min-h-11 w-full items-center justify-center rounded-full border border-primary bg-primary/5 px-4 py-3 text-sm font-medium text-primary"
        >
          Enrolled — View My Courses
        </Link>
      </div>
    );
  }

  if (enrollmentStatus === PENDING_ENROLLMENT_APPROVAL) {
    return (
      <div className="mt-4">
        <Link
          href="/profile/courses"
          className="flex min-h-11 w-full items-center justify-center rounded-full border border-amber-300 bg-warning-bg px-4 py-3 text-sm font-medium text-warning-text"
        >
          Awaiting enrollment approval
        </Link>
      </div>
    );
  }

  if (enrollmentStatus === AWAITING_ENROLLMENT_FEE) {
    return (
      <div className="mt-4">
        <Link
          href={hasPendingEnrollmentPayment ? "/profile/payments" : enrollmentPayHref}
          className="flex min-h-11 w-full items-center justify-center rounded-full border border-amber-300 bg-warning-bg px-4 py-3 text-sm font-medium text-warning-text"
        >
          {hasPendingEnrollmentPayment ? "Awaiting payment verification" : "Pay enrollment fee"}
        </Link>
      </div>
    );
  }

  if (enrollmentStatus) {
    return (
      <div className="mt-4">
        <Link
          href="/profile/courses"
          className="flex min-h-11 w-full items-center justify-center rounded-full border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground"
        >
          View enrollment status
        </Link>
      </div>
    );
  }

  if (enrollmentClosedMessage && !isEnrolled && !enrollmentStatus) {
    return (
      <div className="mt-4">
        <p
          className="rounded-lg border border-amber-200 bg-warning-bg px-3 py-2.5 text-center text-sm text-warning-text"
          role="status"
        >
          {enrollmentClosedMessage}
        </p>
      </div>
    );
  }

  async function handleEnroll() {
    setError("");
    setLoading(true);
    trackButtonClick("Enroll Now", `/courses/${courseId}`);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });

      const data = await res.json();

      if (res.status === 401) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent(`/courses`)}`;
        return;
      }

      if (res.status === 403 && data.profileIncomplete) {
        window.location.href = data.redirectUrl ?? PROFILE_COMPLETE_REDIRECT;
        return;
      }

      if (res.status === 400 && data.alreadyEnrolled) {
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
          return;
        }
        setError(data.error || "You already have an enrollment request for this course.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || "Could not submit enrollment request.");
        setLoading(false);
        return;
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      setError("Unexpected response. Please try again.");
      setLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (!session?.user) {
    return (
      <Link
        href={`/login?callbackUrl=${encodeURIComponent("/courses")}`}
        className="mt-4 flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-light"
      >
        Sign in to request enrollment
      </Link>
    );
  }

  if (!profileComplete) {
    return (
      <Link
        href={PROFILE_COMPLETE_REDIRECT}
        className="mt-4 flex min-h-11 w-full items-center justify-center rounded-full border border-amber-300 bg-warning-bg px-4 py-3 text-sm font-medium text-amber-950 transition-colors hover:bg-warning-bg"
      >
        Complete profile to enroll
      </Link>
    );
  }

  return (
    <div className="mt-4">
      {error && (
        <p className="mb-2 text-center text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleEnroll}
        disabled={loading}
        className="flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-light disabled:opacity-60"
      >
        {loading ? "Submitting…" : "Request enrollment"}
      </button>
    </div>
  );
}
