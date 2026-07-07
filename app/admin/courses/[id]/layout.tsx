import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminCourseNav } from "@/components/admin/AdminCourseNav";
import { CourseStatusBadge } from "@/components/courses/CourseStatusBadge";
import { requireAdmin } from "@/services/auth-actions";
import { getCourseById } from "@/services/courses";

export default async function AdminCourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const course = await getCourseById(id);

  if (!course) notFound();

  return (
    <div>
      <Link href="/admin/courses" className="text-sm font-medium text-primary hover:underline">
        ← Courses
      </Link>

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <CourseStatusBadge status={course.status} />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">{course.category}</span>
        </div>
        <h1 className="mt-2 font-serif text-2xl font-bold text-foreground">{course.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {course.teacher?.name ? `Instructor: ${course.teacher.name}` : "No instructor assigned"}
        </p>
      </div>

      <AdminCourseNav courseId={course.id} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
