"use server";

import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { sendReceiptEmail } from "@/lib/email";
import { generatePdfFromHtml } from "@/lib/pdf-generator";
import { renderReceiptToHtml } from "@/lib/receipt-html";
import { getReceiptFilename } from "@/lib/payment-receipt";
import { getSocialLinksSettings, formatWhatsAppForDisplay } from "@/lib/social-links";
import { getAcademySettings } from "@/lib/academy-settings";
import { INVOICE_TERMS, AUTHORITY_SIGNATURE } from "@/lib/academy-contact";
import { getCourseById } from "@/lib/courses";
import { ReceiptData } from "@/types/receipt";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

export async function generateReceipt(paymentRecordId: string, includeGst: boolean) {
  const session = await auth();
  const isAdmin = isAdminSession(session);

  if (!isAdmin) {
    throw new Error("Unauthorized: Only admins can generate receipts.");
  }

  const record = await prisma.paymentRecord.findUnique({
    where: { id: paymentRecordId },
    include: {
      user: { select: { id: true, name: true, email: true, address: true, whatsapp: true } },
      submission: { select: { paymentMethod: true, upiTransactionId: true, label: true } },
    },
  });

  if (!record) {
    throw new Error("Payment record not found.");
  }

  if (record.receiptGeneratedAt) {
    throw new Error("Receipt has already been generated.");
  }

  const invoiceNumber = `DQA-INV-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  let baseAmount = record.amountInrPaise;
  let gstAmount = 0;

  if (includeGst) {
    // Math logic based on user's specific inclusive rule
    // "Total: ₹100, GST: ₹18, Fee: ₹82" => GST is exactly 18% of the total amount.
    gstAmount = Math.round(record.amountInrPaise * 0.18);
    baseAmount = record.amountInrPaise - gstAmount;
  }

  await prisma.paymentRecord.update({
    where: { id: paymentRecordId },
    data: {
      receiptGeneratedAt: new Date(),
      invoiceNumber,
      receiptIncludesGst: includeGst,
      receiptFeeAmountPaise: baseAmount,
      receiptGstAmountPaise: gstAmount,
    },
  });

  // Fire-and-forget: generate PDF and send email in the background.
  // Errors are logged but never thrown — the admin action always succeeds.
  (async () => {
    try {
      const course = record.courseId ? await getCourseById(record.courseId) : null;
      const courseTitle = course?.title ?? "Darse Quran Academy";

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
        console.error("[receipt-email] Could not load images:", e);
      }

      const receiptData: ReceiptData = {
        academy: {
          name: academySettings.academyName,
          address: academySettings.academyAddress,
          phone: formatWhatsAppForDisplay(socialLinks.whatsappNumber) || "",
          email: socialLinks.contactEmail || "",
          website: academySettings.academyWebsite,
          logoUrl: base64Logo,
        },
        student: {
          name: record.user.name || "Student",
          address: record.user.address || "N/A",
          phone: record.user.whatsapp ? formatWhatsAppForDisplay(record.user.whatsapp) : "N/A",
        },
        payment: {
          receiptId: invoiceNumber,
          date: new Date().toLocaleDateString("en-IN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          method: record.submission?.paymentMethod || record.paymentType || "MANUAL",
          courseName: courseTitle,
          amount: record.amountInrPaise / 100,
          baseAmount: includeGst ? baseAmount / 100 : undefined,
          gstAmount: includeGst ? gstAmount / 100 : undefined,
          currency: "₹",
        },
        authority: {
          name: AUTHORITY_SIGNATURE.name,
          designation: AUTHORITY_SIGNATURE.designation,
          signatureUrl: base64Signature,
          stampUrl: base64Stamp,
        },
        termsAndConditions: [...INVOICE_TERMS],
      };

      const componentHtml = renderReceiptToHtml(receiptData);
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: white !important; margin: 0; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <div class="p-8 flex justify-center min-h-screen">${componentHtml}</div>
        </body>
        </html>
      `;

      const pdfBuffer = await generatePdfFromHtml(fullHtml, { format: "A4", landscape: false });
      const amountStr = `₹${(record.amountInrPaise / 100).toFixed(2)}`;
      const pdfFilename = getReceiptFilename(courseTitle, paymentRecordId);

      const result = await sendReceiptEmail({
        to: record.user.email,
        studentName: record.user.name || "",
        courseTitle,
        invoiceNumber,
        amountStr,
        pdfBuffer,
        pdfFilename,
      });

      if (result.sent) {
        await prisma.paymentRecord.update({
          where: { id: paymentRecordId },
          data: { receiptEmailSentAt: new Date() },
        });
        console.info("[receipt-email] Receipt email sent to:", record.user.email);
      } else if (result.skipped) {
        console.info("[receipt-email] Email skipped (SMTP not configured).");
      } else {
        console.error("[receipt-email] Failed to send receipt email:", result.error);
      }
    } catch (err) {
      console.error("[receipt-email] Unexpected error while sending receipt email:", err);
    }
  })();

  return { success: true, invoiceNumber };
}

export async function deleteReceipt(paymentRecordId: string) {
  const session = await auth();
  const isAdmin = isAdminSession(session);

  if (!isAdmin) {
    return { error: "Unauthorized: Only admins can delete receipts." };
  }

  const record = await prisma.paymentRecord.findUnique({
    where: { id: paymentRecordId },
  });

  if (!record) {
    return { error: "Payment record not found." };
  }

  if (!record.receiptGeneratedAt) {
    return { error: "Receipt has not been generated." };
  }

  await prisma.paymentRecord.update({
    where: { id: paymentRecordId },
    data: {
      receiptGeneratedAt: null,
      invoiceNumber: null,
      receiptIncludesGst: null,
      receiptFeeAmountPaise: null,
      receiptGstAmountPaise: null,
      receiptEmailSentAt: null,
    },
  });

  return { success: true };
}
