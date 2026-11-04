import { NewGradePage } from "@/components/teaching/GradePages";

export default async function TeacherNewGradePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NewGradePage role="teacher" basePath="/teacher/courses" courseId={id} />;
}
