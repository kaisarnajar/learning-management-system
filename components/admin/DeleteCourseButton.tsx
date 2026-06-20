"use client";

import { deleteCourse } from "@/app/admin/courses/actions";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";

export function DeleteCourseButton({
  id,
  title,
  studentCount,
}: {
  id: string;
  title: string;
  studentCount: number;
}) {
  return (
    <DeleteActionButton
      action={deleteCourse.bind(null, id)}
      itemName={title}
      warningMessage={
        studentCount > 0
          ? `This course can't be deleted because ${studentCount} student${studentCount === 1 ? "" : "s"} ${studentCount === 1 ? "is" : "are"} enrolled.`
          : undefined
      }
      className="text-sm font-medium text-destructive-text hover:underline"
    />
  );
}
