import { requireTeacher } from "@/services/auth-actions";
import { getEnrolledStudentsForGrades, getGradeRecordsForGradeId } from "@/app/actions/grades";
import { GradeForm } from "@/components/grades/GradeForm";
import { notFound } from "next/navigation";

export default async function TeacherEditGradePage({
  params,
}: {
  params: Promise<{ id: string; gradeId: string }>;
}) {
  await requireTeacher();
  const { id, gradeId } = await params;
  
  const [students, gradeData] = await Promise.all([
    getEnrolledStudentsForGrades(id),
    getGradeRecordsForGradeId(id, gradeId),
  ]);

  if (!gradeData) notFound();

  // Convert records to a map of enrollmentId -> marksObtained
  const initialRecords: Record<string, number> = {};
  for (const r of gradeData.records) {
    initialRecords[r.enrollmentId] = r.marksObtained;
  }

  return (
    <div className="py-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Edit Grade Card</h2>
        <p className="text-sm text-muted">Update exam performance for enrolled students.</p>
      </div>

      <GradeForm
        courseId={id}
        baseUrl="/teacher/courses"
        students={students}
        initialGradeId={gradeId}
        initialTitle={gradeData.title}
        initialDate={new Date(gradeData.date)}
        initialMaxMarks={gradeData.maxMarks}
        initialRecords={initialRecords}
      />
    </div>
  );
}
