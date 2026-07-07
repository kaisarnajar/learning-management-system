import { requireAdmin } from "@/services/auth-actions";
import { getEnrolledStudentsForAttendance } from "@/app/actions/attendance";
import { AttendanceForm } from "@/components/attendance/AttendanceForm";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

export default async function AdminNewAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const students = await getEnrolledStudentsForAttendance(id);

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/admin/courses/${id}/attendance`}
          className="p-2 text-muted hover:text-foreground bg-surface rounded-full hover:bg-accent-muted/50 transition-colors border border-border shadow-sm"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Mark New Attendance</h1>
      </div>

      <AttendanceForm
        courseId={id}
        baseUrl="/admin/courses"
        students={students}
      />
    </div>
  );
}
