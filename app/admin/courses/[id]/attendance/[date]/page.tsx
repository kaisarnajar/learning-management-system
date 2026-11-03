import { ViewAttendancePage } from "@/components/teaching/AttendancePages";

export default async function AdminViewAttendancePage({
  params,
}: {
  params: Promise<{ id: string; date: string }>;
}) {
  const { id, date } = await params;
  return <ViewAttendancePage role="admin" basePath="/admin/courses" courseId={id} date={date} />;
}
