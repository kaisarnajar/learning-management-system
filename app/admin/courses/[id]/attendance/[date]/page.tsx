import { requireAdmin } from "@/lib/auth-actions";
import { getEnrolledStudentsForAttendance, getAttendanceRecordsForDate } from "@/app/actions/attendance";
import { AttendanceForm } from "@/components/attendance/AttendanceForm";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { notFound } from "next/navigation";

export default async function AdminEditAttendancePage({
  params,
}: {
  params: { id: string; date: string };
}) {
  await requireAdmin();
  const dateObj = new Date(params.date);
  
  if (isNaN(dateObj.getTime())) {
    notFound();
  }

  const [students, attendance] = await Promise.all([
    getEnrolledStudentsForAttendance(params.id),
    getAttendanceRecordsForDate(params.id, dateObj),
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
          href={`/admin/courses/${params.id}/attendance`}
          className="p-2 text-gray-500 hover:text-gray-900 bg-white rounded-full hover:bg-gray-100 transition-colors border border-gray-200 shadow-sm"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Edit Attendance - {new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(dateObj)}
        </h1>
      </div>

      <AttendanceForm
        courseId={params.id}
        baseUrl="/admin/courses"
        students={students}
        initialDate={dateObj}
        initialRecords={initialRecords}
      />
    </div>
  );
}
