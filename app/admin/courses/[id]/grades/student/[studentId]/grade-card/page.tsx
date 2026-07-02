import { requireAdmin } from "@/lib/auth-actions";
import { getStudentGradeReport } from "@/app/actions/grades";
import { GradeCardPreview } from "@/components/grades/GradeCardPreview";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AdminStudentGradeCardPage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  await requireAdmin();
  const { id, studentId } = await params;

  // Verify enrollment exists and user is authorized
  const report = await getStudentGradeReport(studentId);
  if (!report) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/courses/${id}/grades/student/${studentId}`}
        className="text-sm text-primary hover:underline mb-4 inline-block"
      >
        ← Back to student grade report
      </Link>
      <GradeCardPreview enrollmentId={studentId} />
    </div>
  );
}
