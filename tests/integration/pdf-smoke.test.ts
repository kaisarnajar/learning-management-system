import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { GET as downloadReceipt } from "@/app/api/receipt/[paymentRecordId]/route";
import { getReceiptPdf, receiptPdfKey } from "@/services/documents";
import { getPaymentRecordById } from "@/services/payments";
import { createCourse, createUser, resetDb, sessionFor, SKIP_WITHOUT_DB } from "../helpers/db";

/**
 * Receipt PDFs: the stored-file fallback, and (with PDF_SMOKE=1) a real
 * Chromium render. The render needs Puppeteer's browser, which `npm ci`
 * downloads; CI sets PDF_SMOKE=1 in the verify job.
 */
const PDF_SMOKE = process.env.PDF_SMOKE === "1";

// Private storage is an in-memory bucket, so the test can see what was stored.
const bucket = vi.hoisted(() => new Map<string, Buffer>());
vi.mock("@/utils/s3", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils/s3")>()),
  getR2Client: () => ({
    send: async (command: unknown) => {
      if (command instanceof PutObjectCommand) {
        bucket.set(command.input.Key!, Buffer.from(command.input.Body as Buffer));
        return {};
      }
      if (command instanceof GetObjectCommand) {
        const stored = bucket.get(command.input.Key!);
        if (!stored) throw Object.assign(new Error("NoSuchKey"), { name: "NoSuchKey" });
        return { Body: { transformToByteArray: async () => new Uint8Array(stored) } };
      }
      return {};
    },
  }),
}));

async function issuedReceipt() {
  const student = await createUser({ name: "Aisha Khan", address: "12 Main Street, Srinagar" });
  const course = await createCourse({ title: "Tajweed Foundations" });
  const record = await prisma.paymentRecord.create({
    data: {
      userId: student.id,
      courseId: course.id,
      amountInrPaise: 34900,
      paidAt: new Date("2026-01-05T06:30:00Z"),
      paymentType: "monthly",
      description: "Monthly fee — January 2026",
      invoiceNumber: "DQA-INV/2026-01/00001",
      receiptGeneratedAt: new Date("2026-01-05T06:30:00Z"),
      receiptIncludesGst: false,
    },
  });
  return { student, record };
}

const isPdf = (bytes: Buffer) => bytes.subarray(0, 5).toString("latin1") === "%PDF-";

describe.skipIf(SKIP_WITHOUT_DB)("receipt PDFs", () => {
  beforeEach(async () => {
    await resetDb();
    bucket.clear();
  });

  it("serves the stored file when there is one, without rendering", async () => {
    const { record } = await issuedReceipt();
    const stored = Buffer.from("%PDF-1.7 stored at issue time");
    bucket.set(receiptPdfKey(record.id), stored);
    await prisma.paymentRecord.update({ where: { id: record.id }, data: { receiptPdfKey: receiptPdfKey(record.id) } });

    const result = await getReceiptPdf((await getPaymentRecordById(record.id))!);
    expect(result.fromStore).toBe(true);
    expect(result.pdf.equals(stored)).toBe(true);
    expect(result.filename).toMatch(/\.pdf$/);
  });

  describe.skipIf(!PDF_SMOKE)("rendering with Chromium (PDF_SMOKE=1)", () => {
    it("renders a receipt and keeps it for the next download", { timeout: 120_000 }, async () => {
      const { student, record } = await issuedReceipt();
      vi.mocked(auth).mockResolvedValue(sessionFor(student, "STUDENT") as never);

      const response = await downloadReceipt(new Request("http://localhost:3000/api/receipt/x"), {
        params: Promise.resolve({ paymentRecordId: record.id }),
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/pdf");
      const rendered = Buffer.from(await response.arrayBuffer());
      expect(isPdf(rendered)).toBe(true);
      expect(rendered.length).toBeGreaterThan(5_000);

      // The render was stored, and the next download is served from storage.
      const key = receiptPdfKey(record.id);
      expect(bucket.get(key)?.equals(rendered)).toBe(true);
      expect((await prisma.paymentRecord.findUniqueOrThrow({ where: { id: record.id } })).receiptPdfKey).toBe(key);
      const again = await getReceiptPdf((await getPaymentRecordById(record.id))!);
      expect(again.fromStore).toBe(true);
      expect(again.pdf.equals(rendered)).toBe(true);
    });

    it("renders again when the stored file is missing", { timeout: 120_000 }, async () => {
      const { record } = await issuedReceipt();
      await prisma.paymentRecord.update({ where: { id: record.id }, data: { receiptPdfKey: receiptPdfKey(record.id) } });

      const result = await getReceiptPdf((await getPaymentRecordById(record.id))!);
      expect(result.fromStore).toBe(false);
      expect(isPdf(result.pdf)).toBe(true);
      expect(bucket.has(receiptPdfKey(record.id))).toBe(true);
    });
  });
});
