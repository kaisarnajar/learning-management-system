import { requireTeacher } from "@/services/auth-actions";
import { getCourseGradeCards } from "@/app/actions/grades";
import { GradeList } from "@/components/grades/GradeList";

export default async function TeacherCourseGradesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireTeacher();
  const { id } = await params;
  const grades = await getCourseGradeCards(id);

  return (
    <div className="py-6">
      <GradeList 
        courseId={id}
        baseUrl="/teacher/courses"
        grades={grades}
      />
    </div>
  );
}
