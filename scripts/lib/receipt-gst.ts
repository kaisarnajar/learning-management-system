import type { PrismaClient } from "@prisma/client";
import { splitInclusiveGst } from "../../services/gst";

export type ReceiptGstCorrection = {
  id: string;
  invoiceNumber: string | null;
  generatedAt: Date | null;
  emailedAt: Date | null;
  receiptPdfKey: string | null;
  itemTotalPaise: number;
  storedFeePaise: number | null;
  storedGstPaise: number | null;
  correctFeePaise: number;
  correctGstPaise: number;
};

/**
 * Live (not voided) GST receipts whose stored fee/GST split differs from the
 * inclusive formula. Voided records have no receipt (see getReceiptPdf), so
 * they are never reported or rewritten.
 */
export async function findReceiptGstCorrections(
  prisma: PrismaClient,
  ids: string[] | null = null,
): Promise<{ inspected: number; corrections: ReceiptGstCorrection[] }> {
  const receipts = await prisma.paymentRecord.findMany({
    where: {
      receiptIncludesGst: true,
      receiptGeneratedAt: { not: null },
      voidedAt: null,
      ...(ids ? { id: { in: ids } } : {}),
    },
    orderBy: { receiptGeneratedAt: "asc" },
  });

  const corrections = receipts
    .map((r) => {
      const itemTotal = (r.receiptFeeAmountPaise ?? 0) + (r.receiptGstAmountPaise ?? 0);
      const expected = splitInclusiveGst(itemTotal);
      return {
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        generatedAt: r.receiptGeneratedAt,
        emailedAt: r.receiptEmailSentAt,
        receiptPdfKey: r.receiptPdfKey,
        itemTotalPaise: itemTotal,
        storedFeePaise: r.receiptFeeAmountPaise,
        storedGstPaise: r.receiptGstAmountPaise,
        correctFeePaise: expected.basePaise,
        correctGstPaise: expected.gstPaise,
      };
    })
    .filter((c) => c.storedFeePaise !== c.correctFeePaise || c.storedGstPaise !== c.correctGstPaise);

  return { inspected: receipts.length, corrections };
}

/**
 * Rewrites the split and forgets the stored PDF, which still prints the old
 * amounts; the next download renders (and stores) a corrected receipt. The
 * stored object is deleted after the row no longer points at it.
 */
export async function applyReceiptGstCorrections(
  prisma: PrismaClient,
  corrections: ReceiptGstCorrection[],
  deleteStoredPdf: (record: { id: string; receiptPdfKey: string | null }) => Promise<void>,
): Promise<void> {
  for (const c of corrections) {
    await prisma.paymentRecord.update({
      where: { id: c.id },
      data: { receiptFeeAmountPaise: c.correctFeePaise, receiptGstAmountPaise: c.correctGstPaise, receiptPdfKey: null },
    });
    await deleteStoredPdf({ id: c.id, receiptPdfKey: c.receiptPdfKey });
  }
}
