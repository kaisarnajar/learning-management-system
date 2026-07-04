import { requireAdmin } from "@/lib/auth-actions";
import { getEnrolledStudentsForAttendance, getAttendanceRecordsForDate } from "@/app/actions/attendance";
import { AttendanceForm } from "@/components/attendance/AttendanceForm";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { notFound } from "next/navigation";

export default async function AdminEditAttendancePage({
  params,
}: {
  params: Promise<{ id: string; date: string }>;
}) {
  await requireAdmin();
  const { id, date } = await params;
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    notFound();
  }

  const [students, attendance] = await Promise.all([
    getEnrolledStudentsForAttendance(id),
    getAttendanceRecordsForDate(id, dateObj),
  ]);

  if (!attendance) {
    notFound();
  }

  const initialRecords = attendance.records.reduce((acc, curr) => {
    acc[curr.enrollmentId] = curr.isPresent;
    return acc;
  }, {} as Record<string, boolean>);

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/admin/courses/${id}/attendance`}
          className="p-2 text-muted hover:text-foreground bg-surface rounded-full hover:bg-accent-muted/50 transition-colors border border-border shadow-sm"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">
          Edit Attendance - {new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(dateObj)}
        </h1>
      </div>

      <AttendanceForm
        courseId={id}
        baseUrl="/admin/courses"
        students={students}
        initialDate={dateObj}
        initialRecords={initialRecords}
      />
    </div>
  );
}
