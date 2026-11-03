import { notFound } from "next/navigation";
import { createCourseAnnouncement } from "@/services/course-announcement-actions";
import { AnnouncementFormPage } from "@/components/announcements/AnnouncementFormPage";
import { requireTeacher } from "@/services/auth-actions";
import { getTeacherCourseForPortal } from "@/services/teacher-portal";

export default async function NewCourseAnnouncementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { teacher } = await requireTeacher();
  const course = await getTeacherCourseForPortal(teacher.id, id);

  if (!course) notFound();

  return (
    <AnnouncementFormPage
      backHref={`/teacher/courses/${course.id}/announcements`}
      backLabel="← Back to announcements"
      heading="New announcement"
      description="Choose a category and write your message for students."
      action={createCourseAnnouncement.bind(null, course.id)}
      submitLabel="Post announcement"
      error={error ? decodeURIComponent(error) : undefined}
    />
  );
}
