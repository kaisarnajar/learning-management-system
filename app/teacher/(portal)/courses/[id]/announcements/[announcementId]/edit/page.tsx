import Link from "next/link";
import { notFound } from "next/navigation";
import { updateCourseAnnouncement } from "@/services/course-announcement-actions";
import { AnnouncementForm } from "@/components/teacher/AnnouncementForm";
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

  const action = updateCourseAnnouncement.bind(null, course.id, announcement.id);

  return (
    <div>
      <Link
        href={`/teacher/courses/${course.id}/announcements`}
        className="text-sm font-medium text-primary hover:underline"
      >
        ← Back to announcements
      </Link>
      <h2 className="mt-4 font-serif text-xl font-semibold text-foreground">Edit announcement</h2>
      <div className="mt-6">
        <AnnouncementForm
          action={action}
          submitLabel="Save changes"
          announcement={announcement}
          error={error ? decodeURIComponent(error) : undefined}
        />
      </div>
    </div>
  );
}
