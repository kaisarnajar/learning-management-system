import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentAttendanceReport } from "@/app/actions/attendance";
import { getStudentGradeReport } from "@/app/actions/grades";
import { StudentCardPreview } from "./StudentCardPreview";
import { requireTeachingAccess, type TeachingPageProps } from "./shared";

const CARD_PAGES = {
  grade: {
    loadReport: getStudentGradeReport,
    reportPath: "grades",
    backLabel: "← Back to student grade report",
  },
  attendance: {
    loadReport: getStudentAttendanceReport,
    reportPath: "attendance",
    backLabel: "← Back to student attendance report",
  },
} as const;

/** Admin-only preview of a student's grade/attendance card PDF. */
export async function StudentCardPage(
  props: TeachingPageProps & { kind: keyof typeof CARD_PAGES; enrollmentId: string },
) {
  const { basePath, courseId, kind, enrollmentId } = props;
  await requireTeachingAccess(props);
  const page = CARD_PAGES[kind];

  // Verify enrollment exists, belongs to this course and the user is authorized
  const report = await page.loadReport(enrollmentId);
  if (!report || report.course.id !== courseId) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={`${basePath}/${courseId}/${page.reportPath}/student/${enrollmentId}`}
        className="text-sm text-primary hover:underline mb-4 inline-block"
      >
        {page.backLabel}
      </Link>
      <StudentCardPreview kind={kind} enrollmentId={enrollmentId} />
    </div>
  );
}
