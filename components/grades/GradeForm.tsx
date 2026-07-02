"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveCourseGrade } from "@/app/actions/grades";
import type { GradeRecordInput } from "@/lib/grades";
import { inputClassName, labelClassName } from "@/lib/form";

export type StudentForGrades = {
  id: string;
  rollNumber: number | null;
  user: {
    name: string | null;
    email: string;
  };
};

export type GradeFormProps = {
  courseId: string;
  baseUrl: string;
  students: StudentForGrades[];
  initialGradeId?: string | null;
  initialTitle?: string;
  initialDate?: Date;
  initialMaxMarks?: number;
  initialRecords?: Record<string, number>; // enrollmentId -> marksObtained
};

export function GradeForm({
  courseId,
  baseUrl,
  students,
  initialGradeId = null,
  initialTitle = "",
  initialDate,
  initialMaxMarks,
  initialRecords = {}
}: GradeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initialTitle);
  const [maxMarks, setMaxMarks] = useState<number | "">(
    initialMaxMarks !== undefined ? initialMaxMarks : ""
  );
  
  const [dateStr, setDateStr] = useState(
    initialDate 
      ? initialDate.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );

  // Maintain grades state
  const [gradesState, setGradesState] = useState<Record<string, number | "">>(() => {
    if (Object.keys(initialRecords).length > 0) {
      return initialRecords;
    }
    const state: Record<string, number | ""> = {};
    for (const student of students) {
      state[student.id] = "";
    }
    return state;
  });

  const handleMarkChange = (enrollmentId: string, value: string) => {
    setGradesState(prev => ({
      ...prev,
      [enrollmentId]: value === "" ? "" : Number(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!dateStr) {
      setError("Please select a date.");
      return;
    }
    if (!title.trim()) {
      setError("Please provide an exam title.");
      return;
    }
    if (maxMarks === "" || maxMarks <= 0) {
      setError("Maximum marks must be greater than 0.");
      return;
    }

    const records: GradeRecordInput[] = students.map(s => ({
      enrollmentId: s.id,
      marksObtained: gradesState[s.id] === "" ? 0 : Number(gradesState[s.id]),
    }));

    startTransition(async () => {
      try {
        const parsedDate = new Date(dateStr);
        await saveCourseGrade(initialGradeId, courseId, title, parsedDate, maxMarks, records);
        router.push(`${baseUrl}/${courseId}/grades`);
        router.refresh();
      } catch (err) {
        const errorVal = err as Error;
        setError(errorVal.message || "Failed to save grades");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-border flex flex-col md:flex-row gap-4 justify-between items-end">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div>
            <label htmlFor="exam-title" className={labelClassName}>Exam Title:</label>
            <input
              id="exam-title"
              type="text"
              required
              placeholder="e.g. Mid-Term"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`${inputClassName} w-full`}
            />
          </div>
          <div>
            <label htmlFor="exam-date" className={labelClassName}>Date:</label>
            <input
              id="exam-date"
              type="date"
              required
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className={`${inputClassName} w-full`}
            />
          </div>
          <div>
            <label htmlFor="max-marks" className={labelClassName}>Max Marks:</label>
            <input
              id="max-marks"
              type="number"
              min="1"
              required
              value={maxMarks}
              onChange={(e) => setMaxMarks(e.target.value === "" ? "" : Number(e.target.value))}
              className={`${inputClassName} w-full`}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive-bg text-destructive-text rounded-md border border-border">
          {error}
        </div>
      )}

      <div className="bg-white border border-border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Roll No
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student Name
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Marks Obtained
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-border">
            {students.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-muted">
                  No active students enrolled in this course yet.
                </td>
              </tr>
            ) : (
              students.map((student) => {
                const mark = gradesState[student.id];
                
                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                      {student.rollNumber ?? "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-foreground">
                        {student.user.name ?? "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <input
                        type="number"
                        min="0"
                        max={maxMarks}
                        step="0.01"
                        value={mark}
                        onChange={(e) => handleMarkChange(student.id, e.target.value)}
                        className={`${inputClassName} w-32 text-right inline-block`}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Link
          href={`${baseUrl}/${courseId}/grades`}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent-muted/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending || students.length === 0}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Grades"}
        </button>
      </div>
    </form>
  );
}
