import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { requireAdmin, requireTeacher } from "@/services/auth-actions";
import { getTeacherCourseForPortal } from "@/services/teacher-portal";

export type TeachingRole = "admin" | "teacher";

/** Props every shared attendance/grade page body takes. `basePath` is `/admin/courses` or `/teacher/courses`. */
export type TeachingPageProps = {
  role: TeachingRole;
  basePath: string;
  courseId: string;
};

/** Gate for a portal page: admins pass, teachers must be assigned to the course. */
export async function requireTeachingAccess({ role, courseId }: Pick<TeachingPageProps, "role" | "courseId">) {
  if (role === "admin") {
    await requireAdmin();
    return;
  }
  const { teacher } = await requireTeacher();
  if (!(await getTeacherCourseForPortal(teacher.id, courseId))) notFound();
}

/** Parses a `[date]` route segment, 404ing on garbage. */
export function parseDateParam(date: string) {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) notFound();
  return dateObj;
}

export function BackHeader({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <Link
        href={href}
        className="p-2 text-muted hover:text-foreground bg-surface rounded-full hover:bg-accent-muted/50 transition-colors border border-border shadow-sm"
      >
        <ArrowLeftIcon className="w-5 h-5" />
      </Link>
      <h1 className="text-2xl font-bold text-foreground">{children}</h1>
    </div>
  );
}
