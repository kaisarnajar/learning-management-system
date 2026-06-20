"use client";

import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { removeEnrollmentFromCourse } from "@/app/admin/enrollments/actions";

export function RemoveStudentEnrollmentAction({
  studentNameOrEmail,
  enrollmentId,
  courseId,
}: {
  studentNameOrEmail: string;
  enrollmentId: string;
  courseId: string;
}) {
  return (
    <ConfirmationModal 
      title="Remove Enrollment" 
      description={`Remove ${studentNameOrEmail} from this course? Their account will not be deleted; they can enroll again later.`} 
      actionLabel="Remove" 
      variant="destructive" 
      onConfirm={async () => { 
        const result = await removeEnrollmentFromCourse(enrollmentId, courseId); 
        if (result?.error) window.alert(result.error); 
      }} 
      trigger={<button type="button" className="text-sm font-medium text-destructive-text hover:underline">Remove</button>} 
    />
  );
}
