import { StudentCardPage } from "@/components/teaching/StudentCardPage";

export default async function AdminStudentAttendanceCardPage({
  params,
}: {
  params: Promise<{ id: string; enrollmentId: string }>;
}) {
  const { id, enrollmentId } = await params;
  return <StudentCardPage role="admin" basePath="/admin/courses" courseId={id} kind="attendance" enrollmentId={enrollmentId} />;
}
