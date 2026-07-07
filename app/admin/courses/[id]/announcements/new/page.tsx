import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminCourseAnnouncement } from "@/services/course-announcement-actions";
import { AnnouncementForm } from "@/components/teacher/AnnouncementForm";
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

  const action = createAdminCourseAnnouncement.bind(null, course.id);

  return (
    <div>
      <Link
        href={`/admin/courses/${course.id}/announcements`}
        className="text-sm font-medium text-primary hover:underline"
      >
        ← Back to announcements
      </Link>
      <h2 className="mt-4 font-serif text-xl font-semibold text-foreground">New announcement</h2>
      <p className="mt-1 text-sm text-muted">Students enrolled in this course will see this post.</p>
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
