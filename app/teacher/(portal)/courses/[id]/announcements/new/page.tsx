import Link from "next/link";
import { notFound } from "next/navigation";
import { createCourseAnnouncement } from "@/services/course-announcement-actions";
import { AnnouncementForm } from "@/components/teacher/AnnouncementForm";
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

  const action = createCourseAnnouncement.bind(null, course.id);

  return (
    <div>
      <Link
        href={`/teacher/courses/${course.id}/announcements`}
        className="text-sm font-medium text-primary hover:underline"
      >
        ← Back to announcements
      </Link>
      <h2 className="mt-4 font-serif text-xl font-semibold text-foreground">New announcement</h2>
      <p className="mt-1 text-sm text-muted">Choose a category and write your message for students.</p>
      <div className="mt-6">
        <AnnouncementForm
          action={action}
          submitLabel="Post announcement"
          error={error ? decodeURIComponent(error) : undefined}
        />
      </div>
    </div>
  );
}
