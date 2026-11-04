import { EditAttendancePage } from "@/components/teaching/AttendancePages";

export default async function TeacherEditAttendancePage({
  params,
}: {
  params: Promise<{ id: string; date: string }>;
}) {
  const { id, date } = await params;
  return <EditAttendancePage role="teacher" basePath="/teacher/courses" courseId={id} date={date} />;
}
