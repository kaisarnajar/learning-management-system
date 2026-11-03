import { StudentAttendanceReportPage } from "@/components/teaching/AttendancePages";

export default async function AdminStudentAttendanceReportPage({
  params,
}: {
  params: Promise<{ id: string; enrollmentId: string }>;
}) {
  const { id, enrollmentId } = await params;
  return <StudentAttendanceReportPage role="admin" basePath="/admin/courses" courseId={id} enrollmentId={enrollmentId} />;
}
