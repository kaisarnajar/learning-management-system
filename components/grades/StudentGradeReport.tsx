"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

export type GradeReportRecord = {
  id: string;
  marksObtained: number;
  grade: {
    title: string;
    date: Date;
    maxMarks: number;
  };
};

export type StudentGradeReportProps = {
  backUrl: string;
  studentName: string | null;
  studentEmail: string;
  courseTitle: string;
  records: GradeReportRecord[];
  isAdmin?: boolean;
  courseId?: string;
  enrollmentId?: string;
};

export function StudentGradeReport({
  backUrl,
  studentName,
  studentEmail,
  courseTitle,
  records,
  isAdmin = false,
  courseId,
  enrollmentId,
}: StudentGradeReportProps) {
  const totalExams = records.length;
  let totalMarksObtained = 0;
  let totalMaxMarks = 0;

  for (const record of records) {
    totalMarksObtained += record.marksObtained;
    totalMaxMarks += record.grade.maxMarks;
  }

  const percentage = totalMaxMarks === 0 ? 0 : Math.round((totalMarksObtained / totalMaxMarks) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={backUrl}
            className="p-2 text-muted hover:text-foreground bg-surface rounded-full hover:bg-accent-muted/50 transition-colors border border-border shadow-sm"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Grade Report</h1>
            <p className="text-sm text-muted">
              {studentName || "Student"} ({studentEmail})
            </p>
          </div>
        </div>
        {isAdmin && courseId && enrollmentId && (
          <Link
            href={`/admin/courses/${courseId}/grades/student/${enrollmentId}/grade-card`}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-light self-start sm:self-center"
          >
            View Grade Card
          </Link>
        )}
      </div>

      <div className="bg-surface p-6 rounded-lg border border-border flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{courseTitle}</h2>
          <p className="text-muted text-sm mt-1">Detailed performance summary.</p>
        </div>
        <div className="flex gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-foreground">{totalExams}</div>
            <div className="text-xs text-muted uppercase tracking-wide">Exams</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalMarksObtained}</div>
            <div className="text-xs text-muted uppercase tracking-wide">Obtained</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{totalMaxMarks}</div>
            <div className="text-xs text-muted uppercase tracking-wide">Max</div>
          </div>
          <div className="pl-6 border-l border-border">
            <div className={`text-2xl font-bold ${percentage >= 40 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {percentage}%
            </div>
            <div className="text-xs text-muted uppercase tracking-wide">Percentage</div>
          </div>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-lg border border-border">
          <p className="text-muted">No grade records found for this student yet.</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface-muted">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Exam Title
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                  Marks
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-surface-muted-hover transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {record.grade.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                    {new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(
                      new Date(record.grade.date),
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{record.marksObtained}</span>
                    <span className="text-muted mx-1">/</span>
                    <span className="text-muted">{record.grade.maxMarks}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
