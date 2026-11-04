import { EditAttendancePage } from "@/components/teaching/AttendancePages";

export default async function AdminEditAttendancePage({
  params,
}: {
  params: Promise<{ id: string; date: string }>;
}) {
  const { id, date } = await params;
  return <EditAttendancePage role="admin" basePath="/admin/courses" courseId={id} date={date} />;
}
