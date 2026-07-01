import { requireTeacher } from "@/lib/auth-actions";
import { getEnrolledStudentsForAttendance } from "@/app/actions/attendance";
import { AttendanceForm } from "@/components/attendance/AttendanceForm";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

export default async function TeacherNewAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireTeacher();
  const { id } = await params;
  const students = await getEnrolledStudentsForAttendance(id);

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/teacher/courses/${id}/attendance`}
          className="p-2 text-gray-500 hover:text-gray-900 bg-white rounded-full hover:bg-gray-100 transition-colors border border-gray-200 shadow-sm"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Mark New Attendance</h1>
      </div>

      <AttendanceForm
        courseId={id}
        baseUrl="/teacher/courses"
        students={students}
      />
    </div>
  );
}
