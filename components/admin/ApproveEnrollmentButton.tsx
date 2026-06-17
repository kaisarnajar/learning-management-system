"use client";

import { approveEnrollmentRequest } from "@/app/admin/enrollments/actions";
import { ActionButton } from "@/components/shared/ActionButton";

export function ApproveEnrollmentButton({
  enrollmentId,
  courseId,
}: {
  enrollmentId: string;
  courseId: string;
}) {
  return (
    <ActionButton
      action={(returnTo) => approveEnrollmentRequest(enrollmentId, courseId, returnTo)}
      confirmMessage="Approve this enrollment and grant the student access to the course?"
    >
      Approve enrollment
    </ActionButton>
  );
}
