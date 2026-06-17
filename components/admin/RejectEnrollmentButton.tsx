"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { rejectEnrollmentRequest } from "@/app/admin/enrollments/actions";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export function RejectEnrollmentButton({
  enrollmentId,
  courseId,
}: {
  enrollmentId: string;
  courseId: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();

  if (hidden) return null;

  function getReturnTo() {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function handleReject() {
    if (
      !window.confirm(
        "Reject this enrollment request? The student can request enrollment again from the course page.",
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await rejectEnrollmentRequest(enrollmentId, courseId, getReturnTo());
        if (result?.error) {
          window.alert(result.error);
          return;
        }
        setHidden(true);
      } catch (error) {
        if (isRedirectError(error)) {
          setHidden(true);
          return;
        }
        window.alert("Could not reject enrollment. Please try again.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleReject}
      disabled={pending}
      className="rounded-md border border-red-200 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-red-100 disabled:opacity-60"
    >
      {pending ? "…" : "Reject enrollment"}
    </button>
  );
}
