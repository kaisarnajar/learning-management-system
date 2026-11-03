import { requireTeacher } from "@/services/auth-actions";
import { getTeacherCourseForPortal } from "@/services/teacher-portal";
import { notFound } from "next/navigation";
import { getStudentAttendanceReport } from "@/app/actions/attendance";
import { StudentAttendanceReport } from "@/components/attendance/StudentAttendanceReport";

export default async function TeacherStudentAttendanceReportPage({
  params,
}: {
  params: Promise<{ id: string; enrollmentId: string }>;
}) {
  const { teacher } = await requireTeacher();
  const { id, enrollmentId } = await params;
  if (!(await getTeacherCourseForPortal(teacher.id, id))) notFound();
  const { enrollment, course, records } = await getStudentAttendanceReport(enrollmentId);

  return (
    <div className="py-6">
      <StudentAttendanceReport
        backUrl={`/teacher/courses/${id}`}
        studentName={enrollment.user.name}
        studentEmail={enrollment.user.email}
        courseTitle={course.title}
        records={records}
      />
    </div>
  );
}
