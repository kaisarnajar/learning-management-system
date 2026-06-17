"use client";

import { rejectEnrollmentRequest } from "@/app/admin/enrollments/actions";
import { ActionButton } from "@/components/shared/ActionButton";

export function RejectEnrollmentButton({
  enrollmentId,
  courseId,
}: {
  enrollmentId: string;
  courseId: string;
}) {
  return (
    <ActionButton
      action={(returnTo) => rejectEnrollmentRequest(enrollmentId, courseId, returnTo)}
      confirmMessage="Reject this enrollment? The student will be notified."
      variant="destructive"
    >
      Reject enrollment
    </ActionButton>
  );
}
