import { notFound } from "next/navigation";
import { updateAdminCourseAnnouncement } from "@/services/course-announcement-actions";
import { AnnouncementFormPage } from "@/components/announcements/AnnouncementFormPage";
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

  return (
    <AnnouncementFormPage
      backHref={`/admin/courses/${course.id}/announcements`}
      backLabel="← Back to announcements"
      heading="Edit announcement"
      action={updateAdminCourseAnnouncement.bind(null, course.id, announcement.id)}
      submitLabel="Save changes"
      announcement={announcement}
      error={error ? decodeURIComponent(error) : undefined}
    />
  );
}
