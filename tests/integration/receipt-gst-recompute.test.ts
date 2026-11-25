import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/utils/prisma";
import { applyReceiptGstCorrections, findReceiptGstCorrections } from "@/scripts/lib/receipt-gst";
import { createUser, resetDb, SKIP_WITHOUT_DB } from "../helpers/db";

/** A ₹1,180 GST receipt split the old way (GST = 18% of the total) and stored as a PDF. */
async function wrongSplitReceipt(userId: string, overrides: { voidedAt?: Date; invoiceNumber: string }) {
  return prisma.paymentRecord.create({
    data: {
      userId,
      amountInrPaise: 118_000,
      paidAt: new Date("2026-05-01T06:00:00Z"),
      paymentType: "manual",
      paymentTypeEnum: "MANUAL",
      receiptGeneratedAt: new Date("2026-05-01T06:00:00Z"),
      receiptIncludesGst: true,
      receiptFeeAmountPaise: 96_760,
      receiptGstAmountPaise: 21_240,
      receiptPdfKey: `receipts/${overrides.invoiceNumber}.pdf`,
      ...overrides,
    },
  });
}

/** scripts/recompute-receipt-gst.ts (M18). */
describe.skipIf(SKIP_WITHOUT_DB)("GST receipt recompute", () => {
  beforeEach(resetDb);

  it("never reports a voided record", async () => {
    const student = await createUser();
    const live = await wrongSplitReceipt(student.id, { invoiceNumber: "INV-LIVE" });
    await wrongSplitReceipt(student.id, { invoiceNumber: "INV-VOID", voidedAt: new Date() });

    const { inspected, corrections } = await findReceiptGstCorrections(prisma);

    expect(inspected).toBe(1);
    expect(corrections.map((c) => c.id)).toEqual([live.id]);
    expect(corrections[0]).toMatchObject({ correctFeePaise: 100_000, correctGstPaise: 18_000 });
  });

  it("applying discards the stored PDF so the corrected split is printed", async () => {
    const student = await createUser();
    const live = await wrongSplitReceipt(student.id, { invoiceNumber: "INV-LIVE" });
    const voided = await wrongSplitReceipt(student.id, { invoiceNumber: "INV-VOID", voidedAt: new Date() });
    const deleteStoredPdf = vi.fn(async () => undefined);

    const { corrections } = await findReceiptGstCorrections(prisma);
    await applyReceiptGstCorrections(prisma, corrections, deleteStoredPdf);

    expect(await prisma.paymentRecord.findUniqueOrThrow({ where: { id: live.id } })).toMatchObject({
      receiptFeeAmountPaise: 100_000,
      receiptGstAmountPaise: 18_000,
      receiptPdfKey: null,
    });
    expect(deleteStoredPdf).toHaveBeenCalledExactlyOnceWith({ id: live.id, receiptPdfKey: "receipts/INV-LIVE.pdf" });
    // The voided record is left exactly as it was.
    expect(await prisma.paymentRecord.findUniqueOrThrow({ where: { id: voided.id } })).toMatchObject({
      receiptFeeAmountPaise: 96_760,
      receiptGstAmountPaise: 21_240,
      receiptPdfKey: "receipts/INV-VOID.pdf",
    });
  });
});
