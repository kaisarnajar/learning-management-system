import Link from "next/link";
import { notFound } from "next/navigation";
import { createStudentCourseAnnouncement } from "@/services/course-announcement-actions";
import { AnnouncementForm } from "@/components/teacher/AnnouncementForm";
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
  const action = createStudentCourseAnnouncement.bind(null, course.id, enrollment.id);

  return (
    <div>
      <Link
        href={`/teacher/courses/${course.id}/students/${enrollment.id}/announcements`}
        className="text-sm font-medium text-primary hover:underline"
      >
        ← Back to messages
      </Link>
      <h2 className="mt-4 font-serif text-xl font-semibold text-foreground">Message for {studentName}</h2>
      <p className="mt-1 text-sm text-muted">
        Only this student will see this announcement (e.g. exam score, assignment feedback).
      </p>
      <div className="mt-6">
        <AnnouncementForm
          action={action}
          submitLabel="Send message"
          defaultCategory="EXAMS_TESTS"
          audienceHint={`Only ${studentName} will see this message.`}
          error={error ? decodeURIComponent(error) : undefined}
        />
      </div>
    </div>
  );
}
