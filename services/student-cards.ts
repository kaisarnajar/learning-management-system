import { prisma } from "@/utils/prisma";
import { generateAttendanceCardPdf } from "@/utils/attendance-card-html";
import { generateGradeCardPdf } from "@/utils/grade-card-html";
import { sendAttendanceCardEmail, sendGradeCardEmail } from "@/services/email";

export type StudentCardKind = "grade" | "attendance";

export const STUDENT_CARDS = {
  grade: {
    label: "Grade Card",
    filePrefix: "Grade_Card",
    generatePdf: generateGradeCardPdf,
    sendEmail: sendGradeCardEmail,
  },
  attendance: {
    label: "Attendance Card",
    filePrefix: "Attendance_Card",
    generatePdf: generateAttendanceCardPdf,
    sendEmail: sendAttendanceCardEmail,
  },
} satisfies Record<StudentCardKind, unknown>;

export function isStudentCardKind(value: string): value is StudentCardKind {
  return Object.hasOwn(STUDENT_CARDS, value);
}

/** Renders the student's card PDF and emails it to them. */
export async function sendStudentCardEmail(
  kind: StudentCardKind,
  enrollmentId: string,
): Promise<{ success?: boolean; error?: string }> {
  const card = STUDENT_CARDS[kind];
  try {
    if (!enrollmentId) {
      return { error: "enrollmentId is required." };
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    });

    if (!enrollment) {
      return { error: "Enrollment not found." };
    }

    if (!enrollment.user.email) {
      return { error: "No email address found for this student." };
    }

    const course = await prisma.course.findUnique({
      where: { id: enrollment.courseId },
      select: { title: true }
    });

    if (!course) {
      return { error: "Course not found." };
    }

    const pdfBuffer = await card.generatePdf(enrollmentId);
    const filename = `${card.filePrefix}_${enrollment.user.name?.replace(/\s+/g, '_') || "Student"}.pdf`;

    const emailResult = await card.sendEmail({
      to: enrollment.user.email,
      studentName: enrollment.user.name || "Student",
      courseTitle: course.title,
      pdfBuffer,
      pdfFilename: filename,
    });

    if (emailResult.sent) {
      return { success: true };
    } else {
      return { error: emailResult.error || "Failed to send email." };
    }
  } catch (error) {
    console.error(`sendStudentCardEmail(${kind}) error:`, error);
    return { error: `An unexpected error occurred while generating or sending the ${card.label}.` };
  }
}
