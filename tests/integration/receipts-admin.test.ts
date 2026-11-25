import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { getGeneratedReceiptsPaginated } from "@/services/receipts-admin";
import { deleteReceipt, generateReceipt, sendReceiptToEmailAction } from "@/app/actions/receipts";
import { sendReceiptEmail } from "@/services/email";
import { GET as downloadReceipt } from "@/app/api/receipt/[paymentRecordId]/route";
import { createUser, resetDb, sessionFor, setPaymentSettings, SKIP_WITHOUT_DB } from "../helpers/db";

// No Chromium here: storing and removing the rendered PDF is not under test.
vi.mock("@/services/documents", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/documents")>()),
  storeReceiptPdf: vi.fn(async () => true),
  deleteStoredReceiptPdf: vi.fn(async () => undefined),
}));

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

describe.skipIf(SKIP_WITHOUT_DB)("voided payments have no receipt", () => {
  beforeEach(async () => {
    await resetDb();
    await setPaymentSettings();
    vi.mocked(sendReceiptEmail).mockClear();
  });

  const voidedRecord = (userId: string, receipt: boolean) =>
    prisma.paymentRecord.create({
      data: {
        userId,
        amountInrPaise: 10000,
        paidAt: new Date(),
        paymentType: "manual",
        paymentTypeEnum: "MANUAL",
        voidedAt: new Date(),
        voidReason: "entered twice",
        ...(receipt ? { invoiceNumber: "DQA-INV/2026-27/00001", receiptGeneratedAt: new Date() } : {}),
      },
    });

  const download = (id: string) =>
    downloadReceipt(new Request(`http://localhost:3000/api/receipt/${id}`), { params: Promise.resolve({ paymentRecordId: id }) });

  it("the receipt route answers 404 to the owner and to an admin", async () => {
    const student = await createUser();
    const admin = await createUser({ email: "admin@example.test" });
    const record = await voidedRecord(student.id, true);

    vi.mocked(auth).mockResolvedValue(sessionFor(student, "STUDENT") as never);
    expect((await download(record.id)).status).toBe(404);
    vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);
    expect((await download(record.id)).status).toBe(404);
  });

  it("refuses to generate or e-mail one, and allocates no invoice number", async () => {
    const student = await createUser();
    const admin = await createUser({ email: "admin@example.test" });
    vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);
    const withoutReceipt = await voidedRecord(student.id, false);
    const withReceipt = await voidedRecord(student.id, true);

    await expect(generateReceipt(withoutReceipt.id)).rejects.toThrow("voided");
    expect(await prisma.documentSequence.count()).toBe(0);
    expect((await prisma.paymentRecord.findUniqueOrThrow({ where: { id: withoutReceipt.id } })).invoiceNumber).toBeNull();

    expect(await sendReceiptToEmailAction(withReceipt.id)).toEqual({ error: expect.stringContaining("voided") });
    expect(sendReceiptEmail).not.toHaveBeenCalled();
  });
});

describe.skipIf(SKIP_WITHOUT_DB)("deleting a receipt", () => {
  beforeEach(async () => {
    await resetDb();
    await setPaymentSettings();
    const admin = await createUser({ email: "admin@example.test" });
    vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);
  });

  it("keeps the invoice number, regenerating reissues it, and both are audited", async () => {
    const student = await createUser();
    const record = await prisma.paymentRecord.create({
      data: { userId: student.id, amountInrPaise: 10000, paidAt: new Date(), paymentType: "manual", paymentTypeEnum: "MANUAL" },
    });

    const first = await generateReceipt(record.id);
    expect(await deleteReceipt(record.id)).toEqual({ success: true });
    const deleted = await prisma.paymentRecord.findUniqueOrThrow({ where: { id: record.id } });
    expect(deleted).toMatchObject({
      invoiceNumber: first.invoiceNumber,
      receiptGeneratedAt: null,
      receiptFeeAmountPaise: null,
      receiptShippingAmountPaise: null,
    });
    // A deleted receipt is no longer listed or served.
    expect((await getGeneratedReceiptsPaginated(1, 20)).totalCount).toBe(0);

    const second = await generateReceipt(record.id);
    expect(second.invoiceNumber).toBe(first.invoiceNumber);
    expect(await prisma.documentSequence.findMany()).toEqual([expect.objectContaining({ kind: "invoice", next: 1 })]);

    const audit = await prisma.auditLog.findMany({ where: { entity: "Receipt", entityId: record.id }, orderBy: { createdAt: "asc" } });
    expect(audit.map((e) => e.action)).toEqual(["delete", "generate"]);
    expect(audit[0]!.before).toMatchObject({ invoiceNumber: first.invoiceNumber, receiptFeeAmountPaise: 10000 });
    expect(audit[1]!.after).toMatchObject({ invoiceNumber: first.invoiceNumber, reissued: true });
  });
});
