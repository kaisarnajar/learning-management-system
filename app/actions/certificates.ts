"use server";


import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { sendCertificateEmail } from "@/lib/email";
import { getCertificateFilename, generateCertificatePdf } from "@/lib/certificate";
import { getCourseById } from "@/lib/courses";
import crypto from "crypto";

export async function generateCertificate(enrollmentId: string, certificateType: "APPRECIATION" | "COMPLETION", certificateGrade?: number) {
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
      Number.isNaN(certificateGrade) ||
      certificateGrade < 0 ||
      certificateGrade > 10
    ) {
      return { error: "A valid grade between 0 and 10 is required for a Certificate of Completion." };
    }
  }

  const certificateNumber = `DQA-CERT-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      certificateGeneratedAt: new Date(),
      certificateNumber,
      certificateType,
      certificateGrade: certificateType === "COMPLETION" ? certificateGrade : null,
    },
  });

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
      certificateType: null,
      certificateGrade: null,
    },
  });

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

    const issueDate = enrollment.certificateGeneratedAt.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const pdfBuffer = await generateCertificatePdf({
      studentName: enrollment.user.name || "Student",
      studentAddress: enrollment.user.address,
      courseTitle,
      issueDate,
      certificateNumber: enrollment.certificateNumber,
      certificateType: (enrollment.certificateType as "APPRECIATION" | "COMPLETION" | null) || "COMPLETION",
      certificateGrade: enrollment.certificateGrade,
    });
    const pdfFilename = getCertificateFilename(courseTitle, enrollmentId);

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
