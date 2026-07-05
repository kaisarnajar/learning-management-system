"use client";

import Link from "next/link";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { deleteCourseGrade } from "@/app/actions/grades";
import { adminActionButtonClassName } from "@/lib/form";

export type GradeListProps = {
  courseId: string;
  baseUrl: string; // e.g., "/admin/courses" or "/teacher/courses"
  grades: Array<{
    id: string;
    title: string;
    date: Date;
    maxMarks: number;
    _count: { records: number };
  }>;
};

export function GradeList({ courseId, baseUrl, grades }: GradeListProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Grade Cards</h2>
        <Link
          href={`${baseUrl}/${courseId}/grades/new`}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light transition-colors"
        >
          Add Test Report
        </Link>
      </div>

      {grades.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-lg border border-border">
          <p className="text-muted">No grade cards found for this course.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background/50 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Exam Title</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Max Marks</th>
                <th className="px-4 py-3 font-medium">Enrolled Students</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {grades.map((grade) => {
                const total = grade._count.records;
                const formattedDate = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(grade.date));
                
                return (
                  <tr key={grade.id} className="hover:bg-background/30">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {grade.title}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formattedDate}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {grade.maxMarks}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {total}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`${baseUrl}/${courseId}/grades/${grade.id}/edit`}
                          className={adminActionButtonClassName}
                        >
                          Edit
                        </Link>
                        <DeleteActionButton
                          action={async () => {
                            await deleteCourseGrade(courseId, grade.id);
                          }}
                          itemName={`Grade Card "${grade.title}"`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
