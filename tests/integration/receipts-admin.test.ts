import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/utils/prisma";
import { getGeneratedReceiptsPaginated } from "@/services/receipts-admin";
import { createUser, resetDb, SKIP_WITHOUT_DB } from "../helpers/db";

/** `count` payment records with a generated receipt, invoice numbers 00001.. in issue order. */
async function seedReceipts(count: number) {
  const student = await createUser();
  const issuedFrom = Date.UTC(2026, 0, 1);
  await prisma.paymentRecord.createMany({
    data: Array.from({ length: count }, (_, i) => ({
      userId: student.id,
      amountInrPaise: 10000,
      paidAt: new Date(issuedFrom + i * 60_000),
      paymentType: "manual",
      paymentTypeEnum: "MANUAL" as const,
      invoiceNumber: `DQA-INV/2026-01/${String(i + 1).padStart(5, "0")}`,
      receiptGeneratedAt: new Date(issuedFrom + i * 60_000),
    })),
  });
}

describe.skipIf(SKIP_WITHOUT_DB)("admin receipt list", () => {
  beforeEach(resetDb);

  it("pages past page one", async () => {
    await seedReceipts(45);

    const pages = await Promise.all([1, 2, 3].map((page) => getGeneratedReceiptsPaginated(page, 20)));

    expect(pages.map((p) => p.items.length)).toEqual([20, 20, 5]);
    expect(pages.every((p) => p.totalCount === 45)).toBe(true);
    // Newest first, and no receipt appears on two pages.
    expect(pages[0].items[0].invoiceNumber).toBe("DQA-INV/2026-01/00045");
    expect(pages[2].items.at(-1)!.invoiceNumber).toBe("DQA-INV/2026-01/00001");
    expect(new Set(pages.flatMap((p) => p.items.map((r) => r.id))).size).toBe(45);
  });

  it("clamps a page past the end to the last page", async () => {
    await seedReceipts(45);

    const beyond = await getGeneratedReceiptsPaginated(9, 20);
    expect(beyond.items).toHaveLength(5);
  });
});
