import { requireTeacher } from "@/services/auth-actions";
import { getStudentGradeReport } from "@/app/actions/grades";
import { StudentGradeReport } from "@/components/grades/StudentGradeReport";

export default async function TeacherStudentGradeReportPage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  await requireTeacher();
  const { id, studentId } = await params;
  
  const report = await getStudentGradeReport(studentId);

  return (
    <div className="py-6">
      <StudentGradeReport
        backUrl={`/teacher/courses/${id}/grades`}
        studentName={report.enrollment.user.name}
        studentEmail={report.enrollment.user.email}
        courseTitle={report.course.title}
        records={report.records}
      />
    </div>
  );
}
