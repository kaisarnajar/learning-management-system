import { notFound } from "next/navigation";
import { updateStudentCourseAnnouncement } from "@/services/course-announcement-actions";
import { AnnouncementFormPage } from "@/components/announcements/AnnouncementFormPage";
import { requireTeacher } from "@/services/auth-actions";
import { canTeacherManageCourseAnnouncement, getAnnouncementForCourse } from "@/services/announcements";
import { getTeacherEnrollmentInCourse } from "@/services/teacher-portal";

export default async function EditStudentCourseAnnouncementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; enrollmentId: string; announcementId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id, enrollmentId, announcementId } = await params;
  const { error } = await searchParams;
  const { teacher } = await requireTeacher();
  const data = await getTeacherEnrollmentInCourse(teacher.id, id, enrollmentId);

  if (!data) notFound();

  const { course, enrollment } = data;
  const announcement = await getAnnouncementForCourse(course.id, announcementId, {
    enrollmentId: enrollment.id,
  });
  if (!announcement || !canTeacherManageCourseAnnouncement(announcement, teacher.id)) notFound();

  return (
    <AnnouncementFormPage
      backHref={`/teacher/courses/${course.id}/students/${enrollment.id}/announcements`}
      backLabel="← Back to messages"
      heading="Edit message"
      action={updateStudentCourseAnnouncement.bind(null, course.id, enrollment.id, announcement.id)}
      submitLabel="Save changes"
      announcement={announcement}
      error={error ? decodeURIComponent(error) : undefined}
    />
  );
}
