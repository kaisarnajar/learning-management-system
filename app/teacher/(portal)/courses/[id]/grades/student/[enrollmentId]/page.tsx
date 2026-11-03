import { StudentGradeReportPage } from "@/components/teaching/GradePages";

export default async function TeacherStudentGradeReportPage({
  params,
}: {
  params: Promise<{ id: string; enrollmentId: string }>;
}) {
  const { id, enrollmentId } = await params;
  return <StudentGradeReportPage role="teacher" basePath="/teacher/courses" courseId={id} enrollmentId={enrollmentId} />;
}
