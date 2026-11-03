import { AttendanceListPage } from "@/components/teaching/AttendancePages";

export default async function AdminCourseAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AttendanceListPage role="admin" basePath="/admin/courses" courseId={id} />;
}
