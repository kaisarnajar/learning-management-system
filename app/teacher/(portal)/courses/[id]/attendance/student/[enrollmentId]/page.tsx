import { StudentAttendanceReportPage } from "@/components/teaching/AttendancePages";

export default async function TeacherStudentAttendanceReportPage({
  params,
}: {
  params: Promise<{ id: string; enrollmentId: string }>;
}) {
  const { id, enrollmentId } = await params;
  return <StudentAttendanceReportPage role="teacher" basePath="/teacher/courses" courseId={id} enrollmentId={enrollmentId} />;
}
