import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/services/auth-actions";
import { enrollmentStatusClass, enrollmentStatusLabel } from "@/services/enrollments";
import { formatDateOfBirthDisplay, occupationLabel } from "@/services/profile";
import { getTeacherEnrollmentInCourse } from "@/services/teacher-portal";

export default async function TeacherStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string; enrollmentId: string }>;
}) {
  const { id, enrollmentId } = await params;
  const { teacher } = await requireTeacher();
  const data = await getTeacherEnrollmentInCourse(teacher.id, id, enrollmentId);

  if (!data) notFound();

  const { course, enrollment } = data;
  const student = enrollment.user;
  const studentName = student.name?.trim() || student.email;

  return (
    <div>
      <Link href={`/teacher/courses/${course.id}`} className="text-sm font-medium text-primary hover:underline">
        ← Back to students
      </Link>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">Student profile</h1>
          <p className="mt-1 text-sm text-muted">{student.email}</p>
        </div>
        <Link
          href={`/teacher/courses/${course.id}/students/${enrollment.id}/announcements`}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent-muted/50"
        >
          Message
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="font-serif text-lg font-semibold text-foreground">Enrollment in {course.title}</h2>
        <dl className="mt-4 grid max-w-lg gap-3 text-sm">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-foreground sm:w-36">Status</dt>
            <dd>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${enrollmentStatusClass(enrollment.status)}`}
              >
                {enrollmentStatusLabel(enrollment.status)}
              </span>
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-foreground sm:w-36">Enrolled</dt>
            <dd className="text-muted">
              {enrollment.createdAt.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-foreground sm:w-36">Completed</dt>
            <dd className="text-muted">
              {enrollment.completedAt
                ? enrollment.completedAt.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-lg font-semibold text-foreground">Contact & profile</h2>
        <dl className="mt-4 grid max-w-lg gap-3 text-sm">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-foreground sm:w-36">Name</dt>
            <dd className="text-muted">{studentName}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-foreground sm:w-36">Father&apos;s name</dt>
            <dd className="text-muted">{student.fatherName ?? "—"}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-foreground sm:w-36">Date of birth</dt>
            <dd className="text-muted">{formatDateOfBirthDisplay(student.dateOfBirth)}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-foreground sm:w-36">Occupation</dt>
            <dd className="text-muted">{occupationLabel(student.occupation)}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-foreground sm:w-36">Address</dt>
            <dd className="whitespace-pre-wrap text-muted">{student.address ?? "—"}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-foreground sm:w-36">WhatsApp</dt>
            <dd className="text-muted">{student.whatsapp ?? "—"}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-foreground sm:w-36">Email</dt>
            <dd className="break-all text-muted">{student.email}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-foreground sm:w-36">Joined</dt>
            <dd className="text-muted">
              {student.createdAt.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
