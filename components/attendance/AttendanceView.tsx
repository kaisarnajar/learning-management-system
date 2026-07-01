"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

export type AttendanceViewRecord = {
  rollNumber: number | null;
  name: string | null;
  email: string;
  isPresent: boolean;
};

export type AttendanceViewProps = {
  courseId: string;
  baseUrl: string;
  date: Date;
  records: AttendanceViewRecord[];
};

export function AttendanceView({ courseId, baseUrl, date, records }: AttendanceViewProps) {
  const total = records.length;
  const present = records.filter((r) => r.isPresent).length;
  const absent = total - present;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`${baseUrl}/${courseId}/attendance`}
          className="p-2 text-muted hover:text-foreground bg-surface rounded-full hover:bg-accent-muted/50 transition-colors border border-border shadow-sm"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Attendance Record - {new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date)}
          </h1>
          <p className="text-sm text-muted">
            Summary: {present} Present, {absent} Absent ({total} Total Enrolled)
          </p>
        </div>
      </div>

      <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                Roll No
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                Student Name
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-border">
            {records.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-muted">
                  No attendance records logged for this session.
                </td>
              </tr>
            ) : (
              records.map((record, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                    {record.rollNumber ?? "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    <div>{record.name || "Student"}</div>
                    <div className="text-xs text-muted font-normal">{record.email}</div>
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
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Link
          href={`${baseUrl}/${courseId}/attendance`}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent-muted/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Back to History
        </Link>
        <Link
          href={`${baseUrl}/${courseId}/attendance/${date.toISOString().split("T")[0]}/edit`}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Edit Records
        </Link>
      </div>
    </div>
  );
}
