import { StudentCardPage } from "@/components/teaching/StudentCardPage";

export default async function AdminStudentGradeCardPage({
  params,
}: {
  params: Promise<{ id: string; enrollmentId: string }>;
}) {
  const { id, enrollmentId } = await params;
  return <StudentCardPage role="admin" basePath="/admin/courses" courseId={id} kind="grade" enrollmentId={enrollmentId} />;
}
