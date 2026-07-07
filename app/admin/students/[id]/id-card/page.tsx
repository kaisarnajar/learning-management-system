import { requireAdmin } from "@/services/auth-actions";
import { getStudentUserById } from "@/services/students";
import { notFound } from "next/navigation";
import { IdCardPreview } from "@/components/profile/IdCardPreview";
import Link from "next/link";
import { PageHeader } from "@/components/site/PageHeader";
import { isUserProfileComplete } from "@/services/profile";

export default async function AdminStudentIdCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  
  const student = await getStudentUserById(id);
  if (!student) notFound();

  const profileComplete = await isUserProfileComplete(id);

  if (!profileComplete) {
    return (
      <div className="space-y-6">
        <Link href={`/admin/students/${id}`} className="text-sm text-primary hover:underline">
          ← Back to student profile
        </Link>
        <PageHeader
          title="Digital ID Card"
          description={`ID Card for ${student.name || student.email}`}
        />
        <div className="flex min-h-ui-400 flex-col items-center justify-center rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
          <div className="mb-4 rounded-full bg-warning-bg p-4 text-warning-text">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-xl font-semibold text-foreground">
            Profile Incomplete
          </h3>
          <p className="mb-6 max-w-md text-muted">
            The student needs to complete their profile with all required details before their Student ID Card can be generated.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href={`/admin/students/${id}`} className="text-sm text-primary hover:underline mb-4 inline-block">
        ← Back to student profile
      </Link>
      <IdCardPreview userId={id} />
    </div>
  );
}
