import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseStatusBadge } from "@/components/courses/CourseStatusBadge";
import { CourseDurationDisplay } from "@/components/courses/CourseDurationDisplay";
import { TeacherCourseNav } from "@/components/teacher/TeacherCourseNav";
import { requireTeacher } from "@/services/auth-actions";
import { getTeacherCourseForPortal } from "@/services/teacher-portal";

export default async function TeacherCourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { teacher } = await requireTeacher();
  const course = await getTeacherCourseForPortal(teacher.id, id);

  if (!course) notFound();

  return (
    <div>
      <Link href="/teacher" className="text-sm font-medium text-primary hover:underline">
        ← My courses
      </Link>

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <CourseStatusBadge status={course.status} />
          <span className="text-xs font-semibold uppercase tracking-wide text-gold">{course.category}</span>
        </div>
        <h1 className="mt-2 font-serif text-2xl font-bold text-foreground">{course.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {course.level} · Starts {course.startDate}
        </p>
        <CourseDurationDisplay duration={course.duration} className="mt-1" />
      </div>

      <TeacherCourseNav courseId={course.id} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
