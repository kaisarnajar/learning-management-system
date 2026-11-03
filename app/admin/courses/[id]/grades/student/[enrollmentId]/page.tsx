import { requireAdmin } from "@/services/auth-actions";
import { getStudentGradeReport } from "@/app/actions/grades";
import { StudentGradeReport } from "@/components/grades/StudentGradeReport";
import { notFound } from "next/navigation";

export default async function AdminStudentGradeReportPage({
  params,
}: {
  params: Promise<{ id: string; enrollmentId: string }>;
}) {
  await requireAdmin();
  const { id, enrollmentId } = await params;

  const report = await getStudentGradeReport(enrollmentId);
  if (report.course.id !== id) notFound();

  return (
    <div className="py-6">
      <StudentGradeReport
        backUrl={`/admin/courses/${id}/grades`}
        studentName={report.enrollment.user.name}
        studentEmail={report.enrollment.user.email}
        courseTitle={report.course.title}
        records={report.records}
        isAdmin={true}
        courseId={id}
        enrollmentId={enrollmentId}
      />
    </div>
  );
}
