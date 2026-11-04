import { NewGradePage } from "@/components/teaching/GradePages";

export default async function AdminNewGradePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NewGradePage role="admin" basePath="/admin/courses" courseId={id} />;
}
