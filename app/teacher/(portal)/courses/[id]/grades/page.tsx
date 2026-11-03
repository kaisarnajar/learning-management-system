import { GradeListPage } from "@/components/teaching/GradePages";

export default async function TeacherCourseGradesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GradeListPage role="teacher" basePath="/teacher/courses" courseId={id} />;
}
