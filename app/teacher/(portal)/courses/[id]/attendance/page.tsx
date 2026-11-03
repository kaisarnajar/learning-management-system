import { requireTeacher } from "@/services/auth-actions";
import { getTeacherCourseForPortal } from "@/services/teacher-portal";
import { notFound } from "next/navigation";
import { getCourseAttendanceDates } from "@/app/actions/attendance";
import { AttendanceList } from "@/components/attendance/AttendanceList";

export default async function TeacherCourseAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { teacher } = await requireTeacher();
  const { id } = await params;
  if (!(await getTeacherCourseForPortal(teacher.id, id))) notFound();
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
