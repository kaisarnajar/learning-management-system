"use server";

import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { sendCertificateEmail } from "@/lib/email";
import { generatePdfFromHtml } from "@/lib/pdf-generator";
import { renderCertificateToHtml } from "@/lib/certificate-html";
import { getCertificateFilename } from "@/lib/certificate";
import { getSocialLinksSettings, formatWhatsAppForDisplay } from "@/lib/social-links";
import { getAcademySettings } from "@/lib/academy-settings";
import { getCourseById } from "@/lib/courses";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

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

  // Fire-and-forget: generate PDF and send email in the background.
  // Errors are logged but never thrown — the admin action always succeeds.
  (async () => {
    try {
      const course = await getCourseById(enrollment.courseId);
      const courseTitle = course?.title ?? "Course";

      const [socialLinks, academySettings] = await Promise.all([
        getSocialLinksSettings(),
        getAcademySettings(),
      ]);

      let base64Logo = "";
      let base64Signature = "";
      let base64Stamp = "";
      try {
        const logoPath = path.join(process.cwd(), "public", "assets", "logo.png");
        const sigPath = path.join(process.cwd(), "public", "assets", "signature.png");
        const stampPath = path.join(process.cwd(), "public", "assets", "stamp.png");
        const [logoBytes, sigBytes, stampBytes] = await Promise.all([
          fs.readFile(logoPath).catch(() => null),
          fs.readFile(sigPath).catch(() => null),
          fs.readFile(stampPath).catch(() => null),
        ]);
        if (logoBytes) base64Logo = `data:image/png;base64,${logoBytes.toString("base64")}`;
        if (sigBytes) base64Signature = `data:image/png;base64,${sigBytes.toString("base64")}`;
        if (stampBytes) base64Stamp = `data:image/png;base64,${stampBytes.toString("base64")}`;
      } catch (e) {
        console.error("[cert-email] Could not load images:", e);
      }

      const issueDate = new Date().toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const certData = {
        studentName: enrollment.user.name || "Student",
        address: enrollment.user.address || "N/A",
        courseName: courseTitle,
        issueDate,
        signatureUrl: base64Signature,
        sealUrl: base64Logo,
        stampUrl: base64Stamp,
        academyName: academySettings.academyName,
        academyEmail: socialLinks.contactEmail || "",
        academyPhone: formatWhatsAppForDisplay(socialLinks.whatsappNumber) || "",
        certificateNumber,
        certificateType,
        certificateGrade: certificateType === "COMPLETION" ? certificateGrade : null,
      };

      const componentHtml = renderCertificateToHtml(certData);
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:wght@400;600;700&display=swap" rel="stylesheet" />
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; } }
            @page { size: A4 landscape; margin: 0; }
            body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: white !important; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>${componentHtml}</body>
        </html>
      `;

      const pdfBuffer = await generatePdfFromHtml(fullHtml, { format: "A4", landscape: true });
      const pdfFilename = getCertificateFilename(courseTitle, enrollmentId);

      const result = await sendCertificateEmail({
        to: enrollment.user.email,
        studentName: enrollment.user.name || "",
        courseTitle,
        certificateNumber,
        certificateType,
        pdfBuffer,
        pdfFilename,
      });

      if (result.sent) {
        await prisma.enrollment.update({
          where: { id: enrollmentId },
          data: { certificateEmailSentAt: new Date() },
        });
        console.info("[cert-email] Certificate email sent to:", enrollment.user.email);
      } else if (result.skipped) {
        console.info("[cert-email] Email skipped (SMTP not configured).");
      } else {
        console.error("[cert-email] Failed to send certificate email:", result.error);
      }
    } catch (err) {
      console.error("[cert-email] Unexpected error while sending certificate email:", err);
    }
  })();

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
