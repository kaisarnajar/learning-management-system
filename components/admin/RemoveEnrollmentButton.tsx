"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeEnrollmentFromCourse } from "@/app/admin/enrollments/actions";

type RemoveEnrollmentButtonProps = {
  enrollmentId: string;
  courseId: string;
  studentLabel: string;
};

export function RemoveEnrollmentButton({
  enrollmentId,
  courseId,
  studentLabel,
}: RemoveEnrollmentButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    const message = `Remove ${studentLabel} from this course? Their account will not be deleted; they can enroll again later.`;
    if (!window.confirm(message)) return;

    setLoading(true);
    const result = await removeEnrollmentFromCourse(enrollmentId, courseId);
    setLoading(false);

    if (result.error) {
      window.alert(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={loading}
      className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-red-100 disabled:opacity-60"
    >
      {loading ? "…" : "Remove"}
    </button>
  );
}
