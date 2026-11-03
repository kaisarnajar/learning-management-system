import { GradeListPage } from "@/components/teaching/GradePages";

export default async function AdminCourseGradesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GradeListPage role="admin" basePath="/admin/courses" courseId={id} />;
}
