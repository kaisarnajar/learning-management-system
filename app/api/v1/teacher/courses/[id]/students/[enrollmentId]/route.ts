import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { courseHeader } from "@/services/api-course-tools";
import { TEACHER_ROLES, staffRead } from "@/services/api-staff";
import { enrollmentStatusLabel } from "@/services/enrollments";
import { formatDateOfBirthDisplay, occupationLabel } from "@/services/profile";
import { formatRollNumber } from "@/services/roll-numbers";
import { getTeacherEnrollmentInCourse } from "@/services/teacher-portal";

type Params = { params: Promise<{ id: string; enrollmentId: string }> };

/** A student of the teacher's course, as on /teacher/courses/[id]/students/[enrollmentId]. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id, enrollmentId } = await params;
  return staffRead(request, TEACHER_ROLES, "api/v1/teacher/courses/[id]/students/[enrollmentId]", async (ctx) => {
    const data = await getTeacherEnrollmentInCourse(ctx.teacherId!, id, enrollmentId);
    if (!data) notFound();
    const { course, enrollment } = data;
    const student = enrollment.user;
    return {
      course: courseHeader(course),
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
        statusLabel: enrollmentStatusLabel(enrollment.status),
        rollNumberLabel: formatRollNumber(enrollment.rollNumber),
        createdAt: enrollment.createdAt,
        completedAt: enrollment.completedAt,
      },
      student: {
        id: student.id,
        name: student.name?.trim() || student.email,
        email: student.email,
        fatherName: student.fatherName,
        dateOfBirthDisplay: formatDateOfBirthDisplay(student.dateOfBirth),
        occupationLabel: occupationLabel(student.occupation),
        address: student.address,
        whatsapp: student.whatsapp,
        createdAt: student.createdAt,
      },
    };
  });
}
