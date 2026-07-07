import Link from "next/link";
import { notFound } from "next/navigation";
import { updateAdminCourseAnnouncement } from "@/services/course-announcement-actions";
import { AnnouncementForm } from "@/components/teacher/AnnouncementForm";
import { requireAdmin } from "@/services/auth-actions";
import { getAnnouncementForCourse } from "@/services/announcements";
import { getCourseById } from "@/services/courses";

export default async function AdminEditCourseAnnouncementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; announcementId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { id, announcementId } = await params;
  const { error } = await searchParams;
  const course = await getCourseById(id);

  if (!course) notFound();

  const announcement = await getAnnouncementForCourse(course.id, announcementId);
  if (!announcement) notFound();

  const action = updateAdminCourseAnnouncement.bind(null, course.id, announcement.id);

  return (
    <div>
      <Link
        href={`/admin/courses/${course.id}/announcements`}
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
