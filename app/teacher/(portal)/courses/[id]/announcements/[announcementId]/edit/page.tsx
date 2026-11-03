import { notFound } from "next/navigation";
import { updateCourseAnnouncement } from "@/services/course-announcement-actions";
import { AnnouncementFormPage } from "@/components/announcements/AnnouncementFormPage";
import { requireTeacher } from "@/services/auth-actions";
import { canTeacherManageCourseAnnouncement, getAnnouncementForCourse } from "@/services/announcements";
import { getTeacherCourseForPortal } from "@/services/teacher-portal";

export default async function EditCourseAnnouncementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; announcementId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id, announcementId } = await params;
  const { error } = await searchParams;
  const { teacher } = await requireTeacher();
  const course = await getTeacherCourseForPortal(teacher.id, id);

  if (!course) notFound();

  const announcement = await getAnnouncementForCourse(course.id, announcementId, { enrollmentId: null });
  if (!announcement || !canTeacherManageCourseAnnouncement(announcement, teacher.id)) notFound();

  return (
    <AnnouncementFormPage
      backHref={`/teacher/courses/${course.id}/announcements`}
      backLabel="← Back to announcements"
      heading="Edit announcement"
      action={updateCourseAnnouncement.bind(null, course.id, announcement.id)}
      submitLabel="Save changes"
      announcement={announcement}
      error={error ? decodeURIComponent(error) : undefined}
    />
  );
}
