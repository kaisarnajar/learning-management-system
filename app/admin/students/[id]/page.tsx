import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { ActionToast } from "@/components/shared/ToastProvider";
import { RemoveStudentEnrollmentAction } from "@/components/admin/RemoveStudentEnrollmentAction";


import { Pagination } from "@/components/shared/Pagination";
import { deleteStudentUserForm } from "@/app/admin/students/actions";
import { formatPrice, getAllCourses } from "@/lib/courses";
import { enrollmentStatusClass, enrollmentStatusLabel } from "@/lib/enrollments";
import { clampPage, parsePaginationParams } from "@/lib/pagination";
import { getPaymentRecordsForUserPaginated } from "@/lib/payments";
import {
  formatDateOfBirthDisplay,
  occupationLabel,
  isUserProfileComplete,
} from "@/lib/profile";
import { formatRollNumber } from "@/lib/roll-numbers";
import { getStudentUserById } from "@/lib/students";
import { getInitialsFromName } from "@/lib/student-reviews";
import { ExternalLink } from "lucide-react";

export default async function AdminStudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; page?: string; saved?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { page: requestedPage, pageSize } = parsePaginationParams(query);

  const [student, courses, paymentsPaginated, profileComplete] = await Promise.all([
    getStudentUserById(id),
    getAllCourses(),
    getPaymentRecordsForUserPaginated(id, requestedPage, pageSize),
    isUserProfileComplete(id),
  ]);

  if (!student) notFound();

  const payments = paymentsPaginated.items;
  const paymentTotalCount = paymentsPaginated.totalCount;
  const page = clampPage(requestedPage, paymentTotalCount, pageSize);

  const titleById = new Map(courses.map((c) => [c.id, c.title]));
  const deleteAction = deleteStudentUserForm.bind(null, id);

  return (
    <div>
      <Link href="/admin/students" className="text-sm text-primary hover:underline">
        ← Back to students
      </Link>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            {student.image ? (
              <Image
                src={student.image.includes("googleusercontent.com") ? student.image.replace(/=s\d+-c/g, "=s1000-c") : student.image}
                alt="Profile"
                width={80}
                height={80}
                className="h-20 w-20 rounded-xl object-cover shadow-sm"
                unoptimized
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-white shadow-sm">
                {getInitialsFromName(student.name ?? "Student")}
              </div>
            )}
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-primary">Student profile</h1>
            <p className="mt-1 text-sm text-muted">{student.email}</p>
          </div>
        </div>
        
        {profileComplete ? (
          <Link
            href={`/admin/students/${id}/id-card`}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-light"
          >
            <ExternalLink className="h-4 w-4" />
            View ID Card
          </Link>
        ) : (
          <button
            disabled
            title="Student must complete their profile first."
            className="inline-flex items-center gap-2 rounded-md bg-muted px-4 py-2 text-sm font-semibold text-white shadow-sm cursor-not-allowed opacity-70"
          >
            <ExternalLink className="h-4 w-4" />
            View ID Card
          </button>
        )}
      </div>

      {query.error && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text" role="alert">
          {decodeURIComponent(query.error)}
        </p>
      )}

      <ActionToast trigger={query.saved === "1"} paramName="saved" message="Student details updated." variant="info" />

      <dl className="mt-6 grid max-w-lg gap-3 text-sm">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Registration No</dt>
          <dd className="text-muted">{student.registrationNumber ?? "—"}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Name</dt>
          <dd className="text-muted">{student.name ?? "—"}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Father&apos;s name</dt>
          <dd className="text-muted">{student.fatherName ?? "—"}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Date of birth</dt>
          <dd className="text-muted">{formatDateOfBirthDisplay(student.dateOfBirth)}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Occupation</dt>
          <dd className="text-muted">{occupationLabel(student.occupation)}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Address</dt>
          <dd className="whitespace-pre-wrap text-muted">{student.address ?? "—"}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">WhatsApp</dt>
          <dd className="text-muted">{student.whatsapp ?? "—"}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Email</dt>
          <dd className="break-all text-muted">{student.email}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Joined</dt>
          <dd className="text-muted">
            {student.createdAt.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </dd>
        </div>
      </dl>

      <section className="mt-10">
        <h2 className="font-serif text-lg font-semibold text-foreground">Payment history</h2>
        <p className="mt-1 text-sm text-muted">Payments appear on the student&apos;s profile.</p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
          {paymentTotalCount === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">No payments recorded yet.</p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-background/50 text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-3 text-muted">
                      {payment.paidAt.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {formatPrice(payment.amountInrPaise)}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {payment.courseId
                        ? (titleById.get(payment.courseId) ?? payment.courseId)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">{payment.description ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Pagination
          basePath={`/admin/students/${id}`}
          params={query}
          page={page}
          totalCount={paymentTotalCount}
          pageSize={pageSize}
        />

      </section>

      <section className="mt-10">
        <h2 className="font-serif text-lg font-semibold text-foreground">Course enrollments</h2>
        <p className="mt-1 text-sm text-muted">
          Remove a student from a single course without deleting their account.
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
          {student.enrollments.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Not enrolled in any courses.</p>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border bg-background/50 text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Roll No</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Enrolled</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {student.enrollments.map((enrollment) => (
                  <tr key={enrollment.id}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {titleById.get(enrollment.courseId) ?? enrollment.courseId}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {formatRollNumber(enrollment.rollNumber)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${enrollmentStatusClass(enrollment.status)}`}
                      >
                        {enrollmentStatusLabel(enrollment.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {enrollment.createdAt.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RemoveStudentEnrollmentAction studentNameOrEmail={student.name ?? student.email} enrollmentId={enrollment.id} courseId={enrollment.courseId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <div className="mt-8 flex items-center gap-4">
        <Link
          href={`/admin/students/${id}/edit`}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-5 py-2 text-sm font-semibold text-foreground hover:bg-accent-muted/30"
        >
          Edit student
        </Link>
        <DeleteActionButton
          action={deleteAction}
          itemName="student account"
        />
      </div>
    </div>
  );
}
