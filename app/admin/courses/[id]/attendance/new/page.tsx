import { NewAttendancePage } from "@/components/teaching/AttendancePages";

export default async function AdminNewAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NewAttendancePage role="admin" basePath="/admin/courses" courseId={id} />;
}
