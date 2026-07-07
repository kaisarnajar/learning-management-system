import { requireAdmin } from "@/services/auth-actions";
import { getCourseGradeCards } from "@/app/actions/grades";
import { GradeList } from "@/components/grades/GradeList";

export default async function AdminCourseGradesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const grades = await getCourseGradeCards(id);

  return (
    <div className="py-6">
      <GradeList 
        courseId={id}
        baseUrl="/admin/courses"
        grades={grades}
      />
    </div>
  );
}
