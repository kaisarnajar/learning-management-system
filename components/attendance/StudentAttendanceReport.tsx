"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

export type AttendanceReportRecord = {
  id: string;
  isPresent: boolean;
  attendance: {
    date: Date;
  };
};

export type StudentAttendanceReportProps = {
  backUrl: string;
  studentName: string | null;
  studentEmail: string;
  courseTitle: string;
  records: AttendanceReportRecord[];
  isAdmin?: boolean;
  courseId?: string;
  enrollmentId?: string;
};

export function StudentAttendanceReport({
  backUrl,
  studentName,
  studentEmail,
  courseTitle,
  records,
  isAdmin = false,
  courseId,
  enrollmentId,
}: StudentAttendanceReportProps) {
  const total = records.length;
  const present = records.filter((r) => r.isPresent).length;
  const absent = total - present;
  const percentage = total === 0 ? 0 : Math.round((present / total) * 100);

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
            <h1 className="text-2xl font-bold text-foreground">Attendance Report</h1>
            <p className="text-sm text-muted">
              {studentName || "Student"} ({studentEmail})
            </p>
          </div>
        </div>
        {isAdmin && courseId && enrollmentId && (
          <Link
            href={`/admin/courses/${courseId}/attendance/student/${enrollmentId}/attendance-card`}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-light self-start sm:self-center"
          >
            View Attendance Card
          </Link>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg border border-border flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{courseTitle}</h2>
          <p className="text-muted text-sm mt-1">Detailed performance summary.</p>
        </div>
        <div className="flex gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-foreground">{total}</div>
            <div className="text-xs text-muted uppercase tracking-wide">Sessions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">{present}</div>
            <div className="text-xs text-muted uppercase tracking-wide">Present</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-600">{absent}</div>
            <div className="text-xs text-muted uppercase tracking-wide">Absent</div>
          </div>
          <div className="pl-6 border-l border-border">
            <div className={`text-2xl font-bold ${percentage >= 75 ? "text-emerald-600" : "text-amber-600"}`}>
              {percentage}%
            </div>
            <div className="text-xs text-muted uppercase tracking-wide">Rate</div>
          </div>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-border">
          <p className="text-muted">No attendance records found for this student yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(
                      new Date(record.attendance.date),
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {record.isPresent ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        Present
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                        Absent
                      </span>
                    )}
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
