import { notFound } from "next/navigation";
import { createAdminCourseAnnouncement } from "@/services/course-announcement-actions";
import { AnnouncementFormPage } from "@/components/announcements/AnnouncementFormPage";
import { requireAdmin } from "@/services/auth-actions";
import { getCourseById } from "@/services/courses";

export default async function AdminNewCourseAnnouncementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { error } = await searchParams;
  const course = await getCourseById(id);

  if (!course) notFound();

  return (
    <AnnouncementFormPage
      backHref={`/admin/courses/${course.id}/announcements`}
      backLabel="← Back to announcements"
      heading="New announcement"
      description="Students enrolled in this course will see this post."
      action={createAdminCourseAnnouncement.bind(null, course.id)}
      submitLabel="Post announcement"
      error={error ? decodeURIComponent(error) : undefined}
    />
  );
}
