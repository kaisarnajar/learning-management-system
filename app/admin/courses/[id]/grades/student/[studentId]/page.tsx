import { requireAdmin } from "@/lib/auth-actions";
import { getStudentGradeReport } from "@/app/actions/grades";
import { StudentGradeReport } from "@/components/grades/StudentGradeReport";

export default async function AdminStudentGradeReportPage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  await requireAdmin();
  const { id, studentId } = await params;
  
  const report = await getStudentGradeReport(studentId);

  return (
    <div className="py-6">
      <StudentGradeReport
        backUrl={`/admin/courses/${id}/grades`}
        studentName={report.enrollment.user.name}
        studentEmail={report.enrollment.user.email}
        courseTitle={report.course.title}
        records={report.records}
      />
    </div>
  );
}
