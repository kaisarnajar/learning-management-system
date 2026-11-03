import { notFound } from "next/navigation";
import {
  getAttendanceRecordsForDate,
  getCourseAttendanceDates,
  getEnrolledStudentsForAttendance,
  getStudentAttendanceReport,
} from "@/app/actions/attendance";
import { AttendanceForm } from "@/components/attendance/AttendanceForm";
import { AttendanceList } from "@/components/attendance/AttendanceList";
import { AttendanceView } from "@/components/attendance/AttendanceView";
import { StudentAttendanceReport } from "@/components/attendance/StudentAttendanceReport";
import { formatCalendarDate } from "@/utils/calendar-date";
import { BackHeader, parseDateParam, requireTeachingAccess, type TeachingPageProps } from "./shared";

export async function AttendanceListPage(props: TeachingPageProps) {
  const { basePath, courseId } = props;
  await requireTeachingAccess(props);
  const dates = await getCourseAttendanceDates(courseId);

  return (
    <div className="py-6">
      <AttendanceList courseId={courseId} baseUrl={basePath} dates={dates} />
    </div>
  );
}

export async function NewAttendancePage(props: TeachingPageProps) {
  const { basePath, courseId } = props;
  await requireTeachingAccess(props);
  const students = await getEnrolledStudentsForAttendance(courseId);

  return (
    <div className="py-6 space-y-6">
      <BackHeader href={`${basePath}/${courseId}/attendance`}>Mark New Attendance</BackHeader>

      <AttendanceForm courseId={courseId} baseUrl={basePath} students={students} />
    </div>
  );
}

export async function ViewAttendancePage(props: TeachingPageProps & { date: string }) {
  const { basePath, courseId } = props;
  await requireTeachingAccess(props);
  const dateObj = parseDateParam(props.date);

  const attendance = await getAttendanceRecordsForDate(courseId, dateObj);
  if (!attendance) notFound();

  const records = attendance.records.map((r) => ({
    rollNumber: r.enrollment.rollNumber,
    name: r.enrollment.user.name,
    email: r.enrollment.user.email,
    isPresent: r.isPresent,
  }));

  return (
    <div className="py-6">
      <AttendanceView courseId={courseId} baseUrl={basePath} date={dateObj} records={records} />
    </div>
  );
}

export async function EditAttendancePage(props: TeachingPageProps & { date: string }) {
  const { basePath, courseId } = props;
  await requireTeachingAccess(props);
  const dateObj = parseDateParam(props.date);

  const [students, attendance] = await Promise.all([
    getEnrolledStudentsForAttendance(courseId),
    getAttendanceRecordsForDate(courseId, dateObj),
  ]);
  if (!attendance) notFound();

  const initialRecords = attendance.records.reduce((acc, curr) => {
    acc[curr.enrollmentId] = curr.isPresent;
    return acc;
  }, {} as Record<string, boolean>);

  return (
    <div className="py-6 space-y-6">
      <BackHeader href={`${basePath}/${courseId}/attendance`}>
        Edit Attendance - {formatCalendarDate(dateObj)}
      </BackHeader>

      <AttendanceForm
        courseId={courseId}
        baseUrl={basePath}
        students={students}
        initialDate={dateObj}
        initialRecords={initialRecords}
      />
    </div>
  );
}

export async function StudentAttendanceReportPage(props: TeachingPageProps & { enrollmentId: string }) {
  const { role, basePath, courseId, enrollmentId } = props;
  await requireTeachingAccess(props);
  const { enrollment, course, records } = await getStudentAttendanceReport(enrollmentId);
  if (course.id !== courseId) notFound();

  return (
    <div className="py-6">
      <StudentAttendanceReport
        backUrl={role === "admin" ? `${basePath}/${courseId}/students` : `${basePath}/${courseId}`}
        studentName={enrollment.user.name}
        studentEmail={enrollment.user.email}
        courseTitle={course.title}
        records={records}
        {...(role === "admin" ? { isAdmin: true, courseId, enrollmentId } : {})}
      />
    </div>
  );
}
