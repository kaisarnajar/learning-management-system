"use client";

import Link from "next/link";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { deleteCourseAttendance } from "@/app/actions/attendance";

export type AttendanceListProps = {
  courseId: string;
  baseUrl: string; // e.g., "/admin/courses" or "/teacher/courses"
  dates: Array<{
    id: string;
    date: Date;
    _count: { records: number };
    records: Array<{ id: string }>; // Present records
  }>;
};

export function AttendanceList({ courseId, baseUrl, dates }: AttendanceListProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Attendance History</h2>
        <Link
          href={`${baseUrl}/${courseId}/attendance/new`}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light transition-colors"
        >
          Mark Attendance
        </Link>
      </div>

      {dates.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-lg border border-border">
          <p className="text-muted">No attendance records found for this course.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background/50 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">
                  Date
                </th>
                <th className="px-4 py-3 font-medium">
                  Present
                </th>
                <th className="px-4 py-3 font-medium">
                  Total Enrolled
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {dates.map((record) => {
                const total = record._count.records;
                const present = record.records.length;
                const absent = total - present;
                const dateStrFormatted = new Date(record.date).toISOString().split('T')[0];
                
                return (
                  <tr key={record.id} className="hover:bg-background/30">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(record.date))}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{present}</span> 
                      <span className="text-muted mx-1">/</span> 
                      <span className="text-rose-600 dark:text-rose-400">{absent} absent</span>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {total}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`${baseUrl}/${courseId}/attendance/${dateStrFormatted}`}
                          className="font-medium text-primary hover:underline"
                        >
                          View
                        </Link>
                        <Link
                          href={`${baseUrl}/${courseId}/attendance/${dateStrFormatted}/edit`}
                          className="font-medium text-primary hover:underline"
                        >
                          Edit
                        </Link>
                        <DeleteActionButton
                          action={async () => {
                            await deleteCourseAttendance(courseId, new Date(record.date));
                          }}
                          itemName={`Attendance for ${new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(record.date))}`}
                          className="text-sm font-medium text-destructive-text hover:underline"
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
