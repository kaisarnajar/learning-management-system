"use server";


import { auth } from "@/services/auth";
import { isAdminSession } from "@/services/admin";
import { prisma } from "@/utils/prisma";
import { sendCertificateEmail } from "@/services/email";

import { getCourseById } from "@/services/courses";
import { allocateDocumentNumber } from "@/services/document-numbers";
import { deleteStoredCertificatePdf, getCertificatePdf, storeCertificatePdf } from "@/services/documents";
import { certificateTypeData, enrollmentStatusOf } from "@/services/status-compat";
import { recordAudit } from "@/services/audit";
import type { CertificateType, EnrollmentStatus } from "@prisma/client";

/** Completion needs a completed enrollment; appreciation an active or completed one. */
const CERTIFIABLE_STATUSES: Record<CertificateType, EnrollmentStatus[]> = {
  COMPLETION: ["COMPLETED"],
  APPRECIATION: ["ACTIVE", "COMPLETED"],
};

function notCertifiableMessage(certificateType: CertificateType) {
  return certificateType === "COMPLETION"
    ? "A Certificate of Completion can only be issued once the enrollment is completed."
    : "A certificate can only be issued for an active or completed enrollment.";
}

export async function generateCertificate(enrollmentId: string, certificateType: CertificateType, certificateGrade?: number) {
  const session = await auth();
  const isAdmin = isAdminSession(session);

  if (!isAdmin) {
    return { error: "Unauthorized: Only admins can generate certificates." };
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { user: { select: { id: true, name: true, email: true, address: true, whatsapp: true, deletedAt: true } } },
  });

  if (!enrollment) {
    return { error: "Enrollment not found." };
  }

  // A deleted account has no name to print and nobody to send it to.
  if (enrollment.user.deletedAt) {
    return { error: "This student has deleted their account." };
  }

  if (enrollment.certificateGeneratedAt) {
    return { error: "Certificate has already been generated." };
  }

  // Checked before a number is allocated, and again by the guarded update.
  const allowed = CERTIFIABLE_STATUSES[certificateType];
  if (!allowed) {
    return { error: "Choose a certificate type." };
  }
  const status = enrollmentStatusOf(enrollment);
  if (!status || !allowed.includes(status)) {
    return { error: notCertifiableMessage(certificateType) };
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
  // second click finds no row to update and reports the duplicate. A deleted
  // certificate kept its number (issued numbers are never given up), so
  // regenerating reuses it.
  let certificateNumber: string;
  try {
    certificateNumber = await prisma.$transaction(async (tx) => {
      const reused = enrollment.certificateNumber;
      const number = reused ?? (await allocateDocumentNumber(tx, "certificate"));
      const updated = await tx.enrollment.updateMany({
        where: {
          id: enrollmentId,
          certificateGeneratedAt: null,
          statusEnum: { in: allowed },
        },
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
      if (reused) {
        await recordAudit(tx, session, {
          action: "generate",
          entity: "Certificate",
          entityId: enrollmentId,
          after: { certificateNumber: number, reissued: true, certificateType, certificateGrade: certificateType === "COMPLETION" ? certificateGrade : null },
        });
      }
      return number;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_GENERATED") {
      // Lost to a concurrent generation, or the enrollment's status changed meanwhile.
      const current = await prisma.enrollment.findUnique({ where: { id: enrollmentId }, select: { certificateGeneratedAt: true } });
      return { error: current?.certificateGeneratedAt ? "Certificate has already been generated." : notCertifiableMessage(certificateType) };
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

  // The certificate number stays on the enrollment so the series has no gap;
  // regenerating reissues it.
  await prisma.$transaction(async (tx) => {
    await tx.enrollment.update({
      where: { id: enrollmentId },
      data: {
        certificateGeneratedAt: null,
        ...certificateTypeData(null),
        certificateGrade: null,
        certificateEmailSentAt: null,
        certificatePdfKey: null,
      },
    });
    await recordAudit(tx, session, {
      action: "delete",
      entity: "Certificate",
      entityId: enrollmentId,
      before: {
        certificateNumber: enrollment.certificateNumber,
        certificateGeneratedAt: enrollment.certificateGeneratedAt,
        certificateType: enrollment.certificateType,
        certificateGrade: enrollment.certificateGrade,
        certificateEmailSentAt: enrollment.certificateEmailSentAt,
      },
      after: { certificateNumber: enrollment.certificateNumber, certificateGeneratedAt: null },
    });
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
