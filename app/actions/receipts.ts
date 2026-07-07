"use server";

import { auth } from "@/services/auth";
import { BRAND_CONFIG } from "@/config/brand";

import { PAYMENTS } from "@/config/constants/payments";
import { isAdminSession } from "@/services/admin";
import { prisma } from "@/utils/prisma";
import { sendReceiptEmail } from "@/services/email";
import { generatePdfFromHtml } from "@/services/pdf-generator";
import { renderReceiptToHtml } from "@/utils/receipt-html";
import { prepareReceiptData } from "@/services/payment-receipt";
import { getCourseById } from "@/services/courses";
import crypto from "crypto";

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
  let shippingAmountPaise = 0;

  if (record.paymentType === "book_purchase") {
    const match = record.description?.match(/Book order #([A-Z0-9]+)/i);
    if (match) {
      const shortId = match[1];
      const bookOrder = await prisma.bookOrder.findFirst({
        where: { 
          userId: record.userId,
          id: { endsWith: shortId.toLowerCase() },
          totalAmountInrPaise: record.amountInrPaise 
        }
      });
      if (bookOrder) {
        shippingAmountPaise = bookOrder.shippingChargeInrPaise;
      }
    }
  }

  const itemTotalPaise = record.amountInrPaise - shippingAmountPaise;

  if (includeGst) {
    // "Total: ₹100, GST: ₹18, Fee: ₹82" => GST is calculated from config
    const gstRate = PAYMENTS.GST_PERCENTAGE / 100;
    gstAmount = Math.round(itemTotalPaise * gstRate);
    baseAmount = itemTotalPaise - gstAmount;
  } else {
    baseAmount = itemTotalPaise;
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

export async function sendReceiptToEmailAction(paymentRecordId: string): Promise<{ success?: boolean; error?: string }> {
  const session = await auth();
  const isAdmin = isAdminSession(session);

  if (!isAdmin) {
    return { error: "Unauthorized: Only admins can send receipts." };
  }

  const record = await prisma.paymentRecord.findUnique({
    where: { id: paymentRecordId },
    include: {
      user: { select: { id: true, name: true, email: true, address: true, whatsapp: true } },
      submission: { select: { paymentMethod: true, upiTransactionId: true, label: true } },
    },
  });

  if (!record || !record.receiptGeneratedAt || !record.invoiceNumber) {
    return { error: "Receipt has not been generated yet or payment record not found." };
  }

  try {
    const course = record.courseId ? await getCourseById(record.courseId) : null;
    const courseTitle = course?.title ?? `${BRAND_CONFIG.name}`;

    const { receiptData, filename: pdfFilename } = await prepareReceiptData(record, courseTitle, {
      invoiceNumberOverride: record.invoiceNumber,
      includeGstOverride: record.receiptIncludesGst ?? false,
      baseAmountPaiseOverride: record.receiptFeeAmountPaise ?? record.amountInrPaise,
      gstAmountPaiseOverride: record.receiptGstAmountPaise ?? 0,
    });

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

    const result = await sendReceiptEmail({
      to: record.user.email,
      studentName: record.user.name || "",
      courseTitle,
      invoiceNumber: record.invoiceNumber,
      amountStr,
      pdfBuffer,
      pdfFilename,
    });

    if (result.sent) {
      await prisma.paymentRecord.update({
        where: { id: paymentRecordId },
        data: { receiptEmailSentAt: new Date() },
      });
      return { success: true };
    } else if (result.skipped) {
      return { error: "Email skipped (SMTP not configured)." };
    } else {
      return { error: result.error || "Failed to send email." };
    }
  } catch (error) {
    console.error("sendReceiptToEmailAction error:", error);
    return { error: "Unexpected error while sending receipt email." };
  }
}
