import { requireAdmin } from "@/lib/auth-actions";
import { getStudentAttendanceReport } from "@/app/actions/attendance";
import { StudentAttendanceReport } from "@/components/attendance/StudentAttendanceReport";

export default async function AdminStudentAttendanceReportPage({
  params,
}: {
  params: Promise<{ id: string; enrollmentId: string }>;
}) {
  await requireAdmin();
  const { id, enrollmentId } = await params;
  const { enrollment, course, records } = await getStudentAttendanceReport(enrollmentId);

  return (
    <div className="py-6">
      <StudentAttendanceReport
        backUrl={`/admin/courses/${id}/students`}
        studentName={enrollment.user.name}
        studentEmail={enrollment.user.email}
        courseTitle={course.title}
        records={records}
      />
    </div>
  );
}
