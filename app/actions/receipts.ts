"use server";

import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function generateReceipt(paymentRecordId: string, includeGst: boolean) {
  const session = await auth();
  const isAdmin = isAdminSession(session);

  if (!isAdmin) {
    throw new Error("Unauthorized: Only admins can generate receipts.");
  }

  const record = await prisma.paymentRecord.findUnique({
    where: { id: paymentRecordId },
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

  return { success: true, invoiceNumber };
}
