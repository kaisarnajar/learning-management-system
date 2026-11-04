import { notFound } from "next/navigation";
import {
  getCourseGradeCards,
  getEnrolledStudentsForGrades,
  getGradeRecordsForGradeId,
  getStudentGradeReport,
} from "@/app/actions/grades";
import { GradeForm } from "@/components/grades/GradeForm";
import { GradeList } from "@/components/grades/GradeList";
import { StudentGradeReport } from "@/components/grades/StudentGradeReport";
import { requireTeachingAccess, type TeachingPageProps } from "./shared";

export async function GradeListPage(props: TeachingPageProps) {
  const { basePath, courseId } = props;
  await requireTeachingAccess(props);
  const grades = await getCourseGradeCards(courseId);

  return (
    <div className="py-6">
      <GradeList courseId={courseId} baseUrl={basePath} grades={grades} />
    </div>
  );
}

export async function NewGradePage(props: TeachingPageProps) {
  const { basePath, courseId } = props;
  await requireTeachingAccess(props);
  const students = await getEnrolledStudentsForGrades(courseId);

  return (
    <div className="py-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Add Test Report</h2>
        <p className="text-sm text-muted">Record exam performance for enrolled students.</p>
      </div>

      <GradeForm courseId={courseId} baseUrl={basePath} students={students} />
    </div>
  );
}

export async function EditGradePage(props: TeachingPageProps & { gradeId: string }) {
  const { basePath, courseId, gradeId } = props;
  await requireTeachingAccess(props);

  const [students, gradeData] = await Promise.all([
    getEnrolledStudentsForGrades(courseId),
    getGradeRecordsForGradeId(courseId, gradeId),
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
        courseId={courseId}
        baseUrl={basePath}
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

export async function StudentGradeReportPage(props: TeachingPageProps & { enrollmentId: string }) {
  const { role, basePath, courseId, enrollmentId } = props;
  await requireTeachingAccess(props);

  const report = await getStudentGradeReport(enrollmentId);
  if (report.course.id !== courseId) notFound();

  return (
    <div className="py-6">
      <StudentGradeReport
        backUrl={`${basePath}/${courseId}/grades`}
        studentName={report.enrollment.user.name}
        studentEmail={report.enrollment.user.email}
        courseTitle={report.course.title}
        records={report.records}
        {...(role === "admin" ? { isAdmin: true, courseId, enrollmentId } : {})}
      />
    </div>
  );
}
