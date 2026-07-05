"use client";

import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { removeEnrollmentFromCourse } from "@/app/admin/enrollments/actions";
import { useToast } from "@/components/shared/ToastProvider";

import { adminDestructiveButtonClassName } from "@/lib/form";

export function RemoveStudentEnrollmentAction({
  studentNameOrEmail,
  enrollmentId,
  courseId,
}: {
  studentNameOrEmail: string;
  enrollmentId: string;
  courseId: string;
}) {
  const { addToast } = useToast();
  return (
    <ConfirmationModal 
      title="Remove Enrollment" 
      description={`Remove ${studentNameOrEmail} from this course? Their account will not be deleted; they can enroll again later.`} 
      actionLabel="Remove" 
      variant="destructive" 
      onConfirm={async () => { 
        const result = await removeEnrollmentFromCourse(enrollmentId, courseId); 
        if (result?.error) addToast(result.error, "error"); 
        else addToast("Enrollment removed successfully.", "success");
      }} 
      trigger={<button type="button" className={adminDestructiveButtonClassName}>Remove</button>} 
    />
  );
}
