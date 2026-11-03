import { NewAttendancePage } from "@/components/teaching/AttendancePages";

export default async function TeacherNewAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NewAttendancePage role="teacher" basePath="/teacher/courses" courseId={id} />;
}
