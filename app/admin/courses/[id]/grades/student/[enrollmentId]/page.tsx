import { StudentGradeReportPage } from "@/components/teaching/GradePages";

export default async function AdminStudentGradeReportPage({
  params,
}: {
  params: Promise<{ id: string; enrollmentId: string }>;
}) {
  const { id, enrollmentId } = await params;
  return <StudentGradeReportPage role="admin" basePath="/admin/courses" courseId={id} enrollmentId={enrollmentId} />;
}
