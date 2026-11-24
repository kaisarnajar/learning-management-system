import { AttendanceListPage } from "@/components/teaching/AttendancePages";

export default async function SharedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AttendanceListPage role="teacher" basePath="/teacher/courses" courseId={id} />;
}
