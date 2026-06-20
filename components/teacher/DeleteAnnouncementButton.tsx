"use client";

import {
  deleteCourseAnnouncement,
  deleteStudentCourseAnnouncement,
} from "@/lib/course-announcement-actions";

type DeleteAnnouncementButtonProps = {
  courseId: string;
  announcementId: string;
  enrollmentId?: string;
  deleteAction?: (courseId: string, announcementId: string) => Promise<void>;
};

export function DeleteAnnouncementButton({
  courseId,
  announcementId,
  enrollmentId,
  deleteAction,
}: DeleteAnnouncementButtonProps) {
  const submitAction = deleteAction
    ? deleteAction.bind(null, courseId, announcementId)
    : enrollmentId
      ? deleteStudentCourseAnnouncement.bind(null, courseId, enrollmentId, announcementId)
      : deleteCourseAnnouncement.bind(null, courseId, announcementId);

  const confirmMessage = enrollmentId
    ? "Delete this message? This cannot be undone."
    : "Delete this announcement? This cannot be undone.";

  return (
    <form
      className="contents"
      action={submitAction}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-sm font-medium text-destructive-text hover:underline">
        Delete
      </button>
    </form>
  );
}
