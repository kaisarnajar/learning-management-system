"use server";

import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function generateCertificate(enrollmentId: string, certificateType: "APPRECIATION" | "COMPLETION", certificateGrade?: number) {
  const session = await auth();
  const isAdmin = isAdminSession(session);

  if (!isAdmin) {
    throw new Error("Unauthorized: Only admins can generate certificates.");
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { user: true },
  });

  if (!enrollment) {
    throw new Error("Enrollment not found.");
  }

  if (enrollment.certificateGeneratedAt) {
    throw new Error("Certificate has already been generated.");
  }

  if (certificateType === "COMPLETION") {
    if (certificateGrade == null || certificateGrade < 0 || certificateGrade > 10) {
      throw new Error("A valid grade between 0 and 10 is required for a Certificate of Completion.");
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

  return { success: true, certificateNumber };
}
