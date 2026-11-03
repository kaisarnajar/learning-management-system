"use server";


import { auth } from "@/services/auth";
import { isAdminSession } from "@/services/admin";
import { prisma } from "@/utils/prisma";
import { sendCertificateEmail } from "@/services/email";

import { getCourseById } from "@/services/courses";
import { allocateDocumentNumber } from "@/services/document-numbers";
import { deleteStoredCertificatePdf, getCertificatePdf, storeCertificatePdf } from "@/services/documents";
import { certificateTypeData } from "@/services/status-compat";
import type { CertificateType } from "@prisma/client";

export async function generateCertificate(enrollmentId: string, certificateType: CertificateType, certificateGrade?: number) {
  const session = await auth();
  const isAdmin = isAdminSession(session);

  if (!isAdmin) {
    return { error: "Unauthorized: Only admins can generate certificates." };
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { user: { select: { id: true, name: true, email: true, address: true, whatsapp: true } } },
  });

  if (!enrollment) {
    return { error: "Enrollment not found." };
  }

  if (enrollment.certificateGeneratedAt) {
    return { error: "Certificate has already been generated." };
  }

  if (certificateType === "COMPLETION") {
    if (
      certificateGrade === undefined ||
      certificateGrade === null ||
      !Number.isInteger(certificateGrade) ||
      certificateGrade < 0 ||
      certificateGrade > 10
    ) {
      return { error: "A whole-number grade from 0 to 10 is required for a Certificate of Completion." };
    }
  }

  // Sequential number + generation flag in one transaction; a concurrent
  // second click finds no row to update and reports the duplicate.
  let certificateNumber: string;
  try {
    certificateNumber = await prisma.$transaction(async (tx) => {
      const number = await allocateDocumentNumber(tx, "certificate");
      const updated = await tx.enrollment.updateMany({
        where: { id: enrollmentId, certificateGeneratedAt: null },
        data: {
          certificateGeneratedAt: new Date(),
          certificateNumber: number,
          ...certificateTypeData(certificateType),
          certificateGrade: certificateType === "COMPLETION" ? certificateGrade : null,
        },
      });
      if (updated.count === 0) {
        throw new Error("ALREADY_GENERATED");
      }
      return number;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_GENERATED") {
      return { error: "Certificate has already been generated." };
    }
    throw error;
  }

  // Render once now and keep the file; a failure is logged and the first
  // download renders instead.
  const issued = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { user: { select: { name: true, address: true } } },
  });
  const course = await getCourseById(enrollment.courseId);
  if (issued && course) await storeCertificatePdf(issued, course.title);

  return { success: "Certificate generated successfully.", certificateNumber };
}

export async function deleteCertificate(enrollmentId: string) {
  const session = await auth();
  const isAdmin = isAdminSession(session);

  if (!isAdmin) {
    return { error: "Unauthorized: Only admins can delete certificates." };
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
  });

  if (!enrollment) {
    return { error: "Enrollment not found." };
  }

  if (!enrollment.certificateGeneratedAt) {
    return { error: "Certificate has not been generated." };
  }

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      certificateGeneratedAt: null,
      certificateNumber: null,
      ...certificateTypeData(null),
      certificateGrade: null,
      certificatePdfKey: null,
    },
  });
  await deleteStoredCertificatePdf(enrollment);

  return { success: "Certificate deleted successfully." };
}

export async function sendCertificateToEmailAction(enrollmentId: string): Promise<{ success?: boolean; error?: string }> {
  const session = await auth();
  const isAdmin = isAdminSession(session);

  if (!isAdmin) {
    return { error: "Unauthorized: Only admins can send certificates." };
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { user: { select: { id: true, name: true, email: true, address: true, whatsapp: true } } },
  });

  if (!enrollment || !enrollment.certificateGeneratedAt || !enrollment.certificateNumber) {
    return { error: "Certificate has not been generated yet or enrollment not found." };
  }

  try {
    const course = await getCourseById(enrollment.courseId);
    const courseTitle = course?.title ?? "Course";

    // Reuses the stored PDF; renders only when none is stored.
    const { pdf: pdfBuffer, filename: pdfFilename } = await getCertificatePdf(enrollment, courseTitle);

    const result = await sendCertificateEmail({
      to: enrollment.user.email,
      studentName: enrollment.user.name || "",
      courseTitle,
      certificateNumber: enrollment.certificateNumber,
      certificateType: (enrollment.certificateType as "APPRECIATION" | "COMPLETION" | null) || "COMPLETION",
      pdfBuffer,
      pdfFilename,
    });

    if (result.sent) {
      await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { certificateEmailSentAt: new Date() },
      });
      return { success: true };
    } else if (result.skipped) {
      return { error: "Email skipped (SMTP not configured)." };
    } else {
      return { error: result.error || "Failed to send email." };
    }
  } catch (error) {
    console.error("sendCertificateToEmailAction error:", error);
    return { error: "Unexpected error while sending certificate email." };
  }
}
