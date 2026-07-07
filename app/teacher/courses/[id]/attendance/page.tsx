import { requireTeacher } from "@/services/auth-actions";
import { getCourseAttendanceDates } from "@/app/actions/attendance";
import { AttendanceList } from "@/components/attendance/AttendanceList";

export default async function TeacherCourseAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireTeacher(); // Ensure logged in as teacher
  const { id } = await params;
  const dates = await getCourseAttendanceDates(id); // This checks if teacher owns the course

  return (
    <div className="py-6">
      <AttendanceList 
        courseId={id}
        baseUrl="/teacher/courses"
        dates={dates}
      />
    </div>
  );
}
