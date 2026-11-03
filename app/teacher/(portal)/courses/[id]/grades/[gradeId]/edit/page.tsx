import { EditGradePage } from "@/components/teaching/GradePages";

export default async function TeacherEditGradePage({
  params,
}: {
  params: Promise<{ id: string; gradeId: string }>;
}) {
  const { id, gradeId } = await params;
  return <EditGradePage role="teacher" basePath="/teacher/courses" courseId={id} gradeId={gradeId} />;
}
