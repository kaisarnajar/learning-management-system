import { requireTeacher } from "@/lib/auth-actions";
import { getEnrolledStudentsForGrades } from "@/app/actions/grades";
import { GradeForm } from "@/components/grades/GradeForm";

export default async function TeacherNewGradePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireTeacher();
  const { id } = await params;
  const students = await getEnrolledStudentsForGrades(id);

  return (
    <div className="py-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Add Grade Card</h2>
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
