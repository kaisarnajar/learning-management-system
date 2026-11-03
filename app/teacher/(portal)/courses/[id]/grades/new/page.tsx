import { requireTeacher } from "@/services/auth-actions";
import { getTeacherCourseForPortal } from "@/services/teacher-portal";
import { notFound } from "next/navigation";
import { getEnrolledStudentsForGrades } from "@/app/actions/grades";
import { GradeForm } from "@/components/grades/GradeForm";

export default async function TeacherNewGradePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { teacher } = await requireTeacher();
  const { id } = await params;
  if (!(await getTeacherCourseForPortal(teacher.id, id))) notFound();
  const students = await getEnrolledStudentsForGrades(id);

  return (
    <div className="py-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Add Test Report</h2>
        <p className="text-sm text-muted">Record exam performance for enrolled students.</p>
      </div>

      <GradeForm
        courseId={id}
        baseUrl="/teacher/courses"
        students={students}
      />
    </div>
  );
}
