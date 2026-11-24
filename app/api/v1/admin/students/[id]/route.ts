import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { deleteStudentUser, updateStudentUserForm } from "@/app/admin/students/actions";
import { ADMIN_ROLES, readActionForm, staffAction, staffRead } from "@/services/api-staff";
import { getAllCourses } from "@/services/courses";
import { enrollmentStatusLabel } from "@/services/enrollments";
import { formatDateOfBirthDisplay, isUserProfileComplete, occupationLabel } from "@/services/profile";
import { formatRollNumber } from "@/services/roll-numbers";
import { getStudentUserById } from "@/services/students";

type Params = { params: Promise<{ id: string }> };

/** One student as on /admin/students/[id]: profile and course enrollments (payments: ./payments). */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/students/[id]", async () => {
    const [student, courses, profileComplete] = await Promise.all([getStudentUserById(id), getAllCourses(), isUserProfileComplete(id)]);
    if (!student) notFound();
    const titleById = new Map(courses.map((c) => [c.id, c.title]));
    return {
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        registrationNumber: student.registrationNumber,
        image: student.image,
        gender: student.gender,
        fatherName: student.fatherName,
        dateOfBirth: student.dateOfBirth,
        dateOfBirthDisplay: student.dateOfBirth ? formatDateOfBirthDisplay(student.dateOfBirth) : null,
        occupation: student.occupation,
        occupationLabel: student.occupation ? occupationLabel(student.occupation) : null,
        address: student.address,
        whatsapp: student.whatsapp,
        createdAt: student.createdAt,
        profileComplete,
        enrollments: student.enrollments.map((e) => ({
          id: e.id,
          courseId: e.courseId,
          courseTitle: titleById.get(e.courseId) ?? e.courseId,
          rollNumber: e.rollNumber == null ? null : formatRollNumber(e.rollNumber),
          status: e.status,
          statusLabel: enrollmentStatusLabel(e.status),
          createdAt: e.createdAt,
        })),
      },
    };
  });
}

/** Edit form fields: name, fatherName, dateOfBirth (YYYY-MM-DD), occupation, address, whatsapp, gender, confirmReplacePhoto. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/students/[id] PATCH", async () =>
    updateStudentUserForm(id, await readActionForm(request)),
  );
}

/** Soft-deletes the account (refused while it has enrollments, pending fees or payment records). */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/students/[id] DELETE", () => deleteStudentUser(id));
}
