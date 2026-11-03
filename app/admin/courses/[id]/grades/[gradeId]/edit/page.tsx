import { EditGradePage } from "@/components/teaching/GradePages";

export default async function AdminEditGradePage({
  params,
}: {
  params: Promise<{ id: string; gradeId: string }>;
}) {
  const { id, gradeId } = await params;
  return <EditGradePage role="admin" basePath="/admin/courses" courseId={id} gradeId={gradeId} />;
}
