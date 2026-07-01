import { requireTeacher } from "@/lib/auth-actions";
import { getCourseAttendanceDates } from "@/app/actions/attendance";
import { AttendanceList } from "@/components/attendance/AttendanceList";

export default async function TeacherCourseAttendancePage({
  params,
}: {
  params: { id: string };
}) {
  await requireTeacher(); // Ensure logged in as teacher
  const dates = await getCourseAttendanceDates(params.id); // This checks if teacher owns the course

  return (
    <div className="py-6">
      <AttendanceList 
        courseId={params.id}
        baseUrl="/teacher/courses"
        dates={dates}
      />
    </div>
  );
}
