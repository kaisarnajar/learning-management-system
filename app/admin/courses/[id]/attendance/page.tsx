import { requireAdmin } from "@/lib/auth-actions";
import { getCourseAttendanceDates } from "@/app/actions/attendance";
import { AttendanceList } from "@/components/attendance/AttendanceList";

export default async function AdminCourseAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const dates = await getCourseAttendanceDates(id);

  return (
    <div className="py-6">
      <AttendanceList 
        courseId={id}
        baseUrl="/admin/courses"
        dates={dates}
      />
    </div>
  );
}
