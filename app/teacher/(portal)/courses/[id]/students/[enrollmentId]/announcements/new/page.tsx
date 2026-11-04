import { notFound } from "next/navigation";
import { createStudentCourseAnnouncement } from "@/services/course-announcement-actions";
import { AnnouncementFormPage } from "@/components/announcements/AnnouncementFormPage";
import { requireTeacher } from "@/services/auth-actions";
import { getTeacherEnrollmentInCourse } from "@/services/teacher-portal";

export default async function NewStudentCourseAnnouncementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; enrollmentId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id, enrollmentId } = await params;
  const { error } = await searchParams;
  const { teacher } = await requireTeacher();
  const data = await getTeacherEnrollmentInCourse(teacher.id, id, enrollmentId);

  if (!data) notFound();

  const { course, enrollment } = data;
  const studentName = enrollment.user.name?.trim() || enrollment.user.email;

  return (
    <AnnouncementFormPage
      backHref={`/teacher/courses/${course.id}/students/${enrollment.id}/announcements`}
      backLabel="← Back to messages"
      heading={`Message for ${studentName}`}
      description="Only this student will see this announcement (e.g. exam score, assignment feedback)."
      action={createStudentCourseAnnouncement.bind(null, course.id, enrollment.id)}
      submitLabel="Send message"
      defaultCategory="EXAMS_TESTS"
      audienceHint={`Only ${studentName} will see this message.`}
      error={error ? decodeURIComponent(error) : undefined}
    />
  );
}
