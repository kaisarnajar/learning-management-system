import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { adminActionButtonClassName } from "@/lib/form";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CourseStatusBadge } from "@/components/courses/CourseStatusBadge";
import { deleteTeacherFromProfile } from "@/app/admin/teachers/actions";
import { getEnrollmentCountsByCourse } from "@/lib/enrollments";
import { getTeacherById } from "@/lib/teachers";
import { getCoursesForTeacher } from "@/lib/teacher-portal";
import { getInitialsFromName } from "@/lib/student-reviews";

export default async function AdminTeacherDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const teacher = await getTeacherById(id);

  if (!teacher) notFound();

  const [courses, enrollmentCounts] = await Promise.all([
    getCoursesForTeacher(id),
    getEnrollmentCountsByCourse(),
  ]);

  const deleteAction = deleteTeacherFromProfile.bind(null, id);

  return (
    <div>
      <Link href="/admin/teachers" className="text-sm text-primary hover:underline">
        ← Back to teachers
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            {teacher.imageUrl ? (
              <Image
                src={teacher.imageUrl.includes("googleusercontent.com") ? teacher.imageUrl.replace(/=s\d+-c/g, "=s1000-c") : teacher.imageUrl}
                alt="Profile"
                width={80}
                height={80}
                className="h-20 w-20 rounded-xl object-cover shadow-sm"
                unoptimized
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-white shadow-sm">
                {getInitialsFromName(teacher.name ?? "Teacher")}
              </div>
            )}
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-primary">Teacher profile</h1>
            <p className="mt-1 text-sm text-muted">{teacher.email ?? "No login email linked"}</p>
          </div>
        </div>
        <Link
          href={`/admin/teachers/${id}/edit`}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent-muted/50"
        >
          Edit teacher
        </Link>
      </div>

      {query.error && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text" role="alert">
          {decodeURIComponent(query.error)}
        </p>
      )}

      <dl className="mt-6 grid max-w-lg gap-3 text-sm">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Name</dt>
          <dd className="text-muted">{teacher.name}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Email</dt>
          <dd className="break-all text-muted">{teacher.email ?? "—"}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Specialization</dt>
          <dd className="text-muted">{teacher.specialization}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Initials</dt>
          <dd className="text-muted">{teacher.initials}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Status</dt>
          <dd>
            <StatusBadge published={teacher.published} />
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Bio</dt>
          <dd className="whitespace-pre-wrap text-muted">{teacher.bio}</dd>
        </div>
        {teacher.imageUrl && (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-foreground sm:w-28">Photo</dt>
            <dd className="text-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={teacher.imageUrl}
                alt={teacher.name}
                className="h-32 w-32 rounded-lg object-cover ring-1 ring-border shadow-sm"
              />
            </dd>
          </div>
        )}
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Registered</dt>
          <dd className="text-muted">
            {teacher.createdAt.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </dd>
        </div>
      </dl>

      <section className="mt-10">
        <h2 className="font-serif text-lg font-semibold text-foreground">Courses teaching</h2>
        <p className="mt-1 text-sm text-muted">Courses assigned to this teacher in the admin panel.</p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
          {courses.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Not assigned to any courses yet.</p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-background/50 text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Students</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td className="px-4 py-3 font-medium text-foreground">{course.title}</td>
                    <td className="px-4 py-3 text-muted">{course.category}</td>
                    <td className="px-4 py-3">
                      <CourseStatusBadge status={course.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/courses/${course.id}/students`}
                        className="font-medium text-primary hover:underline"
                      >
                        {enrollmentCounts.get(course.id) ?? course.studentCount}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/courses/${course.id}/edit`}
                        className={adminActionButtonClassName}
                      >
                        Edit course
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <DeleteActionButton action={deleteAction} itemName="teacher" />
    </div>
  );
}
