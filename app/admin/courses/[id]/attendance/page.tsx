import { requireAdmin } from "@/lib/auth-actions";
import { getCourseAttendanceDates } from "@/app/actions/attendance";
import { AttendanceList } from "@/components/attendance/AttendanceList";

export default async function AdminCourseAttendancePage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();
  const dates = await getCourseAttendanceDates(params.id);

  return (
    <div className="py-6">
      <AttendanceList 
        courseId={params.id}
        baseUrl="/admin/courses"
        dates={dates}
      />
    </div>
  );
}
