import { ViewAttendancePage } from "@/components/teaching/AttendancePages";

export default async function TeacherViewAttendancePage({
  params,
}: {
  params: Promise<{ id: string; date: string }>;
}) {
  const { id, date } = await params;
  return <ViewAttendancePage role="teacher" basePath="/teacher/courses" courseId={id} date={date} />;
}
