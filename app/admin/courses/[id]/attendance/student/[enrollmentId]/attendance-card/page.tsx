import { requireAdmin } from "@/services/auth-actions";
import { getStudentAttendanceReport } from "@/app/actions/attendance";
import { AttendanceCardPreview } from "@/components/attendance/AttendanceCardPreview";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AdminStudentAttendanceCardPage({
  params,
}: {
  params: Promise<{ id: string; enrollmentId: string }>;
}) {
  await requireAdmin();
  const { id, enrollmentId } = await params;

  // Verify enrollment exists and user is authorized
  const report = await getStudentAttendanceReport(enrollmentId);
  if (!report) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/courses/${id}/attendance/student/${enrollmentId}`}
        className="text-sm text-primary hover:underline mb-4 inline-block"
      >
        ← Back to student attendance report
      </Link>
      <AttendanceCardPreview enrollmentId={enrollmentId} />
    </div>
  );
}
