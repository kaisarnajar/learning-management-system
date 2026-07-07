import { requireAdmin } from "@/services/auth-actions";
import { getAttendanceRecordsForDate } from "@/app/actions/attendance";
import { AttendanceView } from "@/components/attendance/AttendanceView";
import { notFound } from "next/navigation";

export default async function AdminViewAttendancePage({
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

  const attendance = await getAttendanceRecordsForDate(id, dateObj);

  if (!attendance) {
    notFound();
  }

  const records = attendance.records.map((r) => ({
    rollNumber: r.enrollment.rollNumber,
    name: r.enrollment.user.name,
    email: r.enrollment.user.email,
    isPresent: r.isPresent,
  }));

  return (
    <div className="py-6">
      <AttendanceView
        courseId={id}
        baseUrl="/admin/courses"
        date={dateObj}
        records={records}
      />
    </div>
  );
}
