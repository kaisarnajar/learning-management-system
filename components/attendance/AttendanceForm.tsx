"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveCourseAttendance, type AttendanceRecordInput } from "@/app/actions/attendance";

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
      } catch (err: any) {
        setError(err.message || "Failed to save attendance");
      }
    });
  };

  const isEditing = !!initialDate;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-4">
          <label htmlFor="attendance-date" className="font-medium text-gray-700">Date:</label>
          <input
            id="attendance-date"
            type="date"
            required
            disabled={isEditing}
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => markAll(true)}
            className="px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-md hover:bg-emerald-100"
          >
            Mark All Present
          </button>
          <button
            type="button"
            onClick={() => markAll(false)}
            className="px-3 py-1.5 text-sm font-medium text-rose-700 bg-rose-50 rounded-md hover:bg-rose-100"
          >
            Mark All Absent
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
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
          <tbody className="bg-white divide-y divide-gray-200">
            {students.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  No approved students enrolled in this course yet.
                </td>
              </tr>
            ) : (
              students.map((student) => {
                const isPresent = attendanceState[student.id] ?? true;
                
                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.rollNumber ?? "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{student.user.name}</div>
                      <div className="text-sm text-gray-500">{student.user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex rounded-md shadow-sm">
                        <button
                          type="button"
                          onClick={() => handleToggle(student.id, true)}
                          className={`relative inline-flex items-center px-4 py-2 rounded-l-md border text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 ${
                            isPresent 
                              ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700' 
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggle(student.id, false)}
                          className={`relative inline-flex items-center px-4 py-2 rounded-r-md border-y border-r border-l-0 text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 ${
                            !isPresent 
                              ? 'bg-rose-600 border-rose-600 text-white hover:bg-rose-700' 
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
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

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Link
          href={`${baseUrl}/${courseId}/attendance`}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending || students.length === 0}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Attendance"}
        </button>
      </div>
    </form>
  );
}
