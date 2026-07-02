"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveCourseAttendance } from "@/app/actions/attendance";
import type { AttendanceRecordInput } from "@/lib/attendance";
import { inputClassName, labelClassName } from "@/lib/form";

export type StudentForAttendance = {
  id: string;
  rollNumber: number | null;
  user: {
    name: string | null;
    email: string;
  };
};

export type AttendanceFormProps = {
  courseId: string;
  baseUrl: string;
  students: StudentForAttendance[];
  initialDate?: Date;
  initialRecords?: Record<string, boolean>; // enrollmentId -> isPresent
};

export function AttendanceForm({ courseId, baseUrl, students, initialDate, initialRecords = {} }: AttendanceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Use local state for the date so we can edit it if it's new
  // Format for input type="date" is YYYY-MM-DD
  const [dateStr, setDateStr] = useState(
    initialDate 
      ? initialDate.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );

  // Maintain attendance state
  const [attendanceState, setAttendanceState] = useState<Record<string, boolean>>(() => {
    // If we have initial records, use them
    if (Object.keys(initialRecords).length > 0) {
      return initialRecords;
    }
    // Otherwise, default all to present
    const state: Record<string, boolean> = {};
    for (const student of students) {
      state[student.id] = true;
    }
    return state;
  });

  const handleToggle = (enrollmentId: string, isPresent: boolean) => {
    setAttendanceState(prev => ({
      ...prev,
      [enrollmentId]: isPresent,
    }));
  };

  const markAll = (isPresent: boolean) => {
    setAttendanceState(prev => {
      const next = { ...prev };
      for (const student of students) {
        next[student.id] = isPresent;
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!dateStr) {
      setError("Please select a date.");
      return;
    }

    const records: AttendanceRecordInput[] = students.map(s => ({
      enrollmentId: s.id,
      isPresent: attendanceState[s.id] ?? true,
    }));

    startTransition(async () => {
      try {
        const parsedDate = new Date(dateStr);
        await saveCourseAttendance(courseId, parsedDate, records);
        router.push(`${baseUrl}/${courseId}/attendance`);
        router.refresh();
      } catch (err) {
        const errorVal = err as Error;
        setError(errorVal.message || "Failed to save attendance");
      }
    });
  };

  const isEditing = !!initialDate;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-border flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-4">
          <label htmlFor="attendance-date" className={labelClassName}>Date:</label>
          <input
            id="attendance-date"
            type="date"
            required
            disabled={isEditing}
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className={`${inputClassName} max-w-[200px] disabled:bg-gray-100 disabled:text-gray-500`}
          />
        </div>
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => markAll(true)}
            className="inline-flex items-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent-muted/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Mark All Present
          </button>
          <button
            type="button"
            onClick={() => markAll(false)}
            className="inline-flex items-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent-muted/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Mark All Absent
          </button>
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
                Status
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
                const isPresent = attendanceState[student.id] ?? true;
                
                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                      {student.rollNumber ?? "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`${baseUrl}/${courseId}/attendance/student/${student.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {student.user.name}
                      </Link>
                      <div className="text-sm text-muted">{student.user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex rounded-md shadow-sm">
                        <button
                          type="button"
                          onClick={() => handleToggle(student.id, true)}
                          className={`relative inline-flex items-center px-4 py-2 rounded-l-md border text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary ${
                            isPresent 
                              ? 'bg-primary border-primary text-white hover:bg-primary-light' 
                              : 'bg-white border-border text-foreground hover:bg-accent-muted/50'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggle(student.id, false)}
                          className={`relative inline-flex items-center px-4 py-2 rounded-r-md border-y border-r border-l-0 text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary ${
                            !isPresent 
                              ? 'bg-primary border-primary text-white hover:bg-primary-light' 
                              : 'bg-white border-border text-foreground hover:bg-accent-muted/50'
                          }`}
                        >
                          Absent
                        </button>
                      </div>
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
          href={`${baseUrl}/${courseId}/attendance`}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent-muted/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending || students.length === 0}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Attendance"}
        </button>
      </div>
    </form>
  );
}
