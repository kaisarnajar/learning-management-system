"use client";

import { deleteCourse } from "@/app/admin/courses/actions";

export function DeleteCourseButton({
  id,
  title,
  studentCount,
}: {
  id: string;
  title: string;
  studentCount: number;
}) {
  const handleClick = () => {
    if (studentCount > 0) {
      window.alert(
        `This course can't be deleted because ${studentCount} student${studentCount === 1 ? "" : "s"} ${studentCount === 1 ? "is" : "are"} enrolled.`,
      );
      return;
    }

    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) {
      return;
    }

    void deleteCourse(id);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-sm font-medium text-destructive-text hover:underline"
    >
      Delete
    </button>
  );
}
