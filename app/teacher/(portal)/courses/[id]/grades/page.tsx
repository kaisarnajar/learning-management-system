import { requireTeacher } from "@/services/auth-actions";
import { getTeacherCourseForPortal } from "@/services/teacher-portal";
import { notFound } from "next/navigation";
import { getCourseGradeCards } from "@/app/actions/grades";
import { GradeList } from "@/components/grades/GradeList";

export default async function TeacherCourseGradesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { teacher } = await requireTeacher();
  const { id } = await params;
  if (!(await getTeacherCourseForPortal(teacher.id, id))) notFound();
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
