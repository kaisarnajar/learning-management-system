import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPrivateBucketName } from "@/utils/s3";
import { certificatePdfKey, deleteStoredCertificatePdf, receiptPdfKey, storeCertificatePdf } from "@/services/documents";
import { deletePrivateObject, putPrivateObject } from "@/services/storage";
import { prisma } from "@/utils/prisma";

vi.mock("@/services/storage", () => ({
  putPrivateObject: vi.fn(async () => undefined),
  getPrivateObject: vi.fn(async () => null),
  deletePrivateObject: vi.fn(async () => undefined),
}));
vi.mock("@/services/certificate", () => ({
  generateCertificatePdf: vi.fn(async () => Buffer.from("%PDF-1.7 certificate")),
  getCertificateFilename: () => "certificate.pdf",
}));

describe("the private bucket", () => {
  beforeEach(() => {
    vi.stubEnv("R2_BUCKET_NAME", "public-bucket");
    vi.stubEnv("VERCEL_ENV", "");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("is R2_PRIVATE_BUCKET_NAME when it is set apart from the public bucket", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("R2_PRIVATE_BUCKET_NAME", "private-bucket");
    expect(getPrivateBucketName()).toBe("private-bucket");
  });

  it.each([
    ["NODE_ENV", "production"],
    ["VERCEL_ENV", "production"],
    ["NODE_ENV", "development"],
  ])("is the main bucket (%s=%s) when it is missing", (name, value) => {
    vi.stubEnv(name, value);
    vi.stubEnv("R2_PRIVATE_BUCKET_NAME", "");
    expect(getPrivateBucketName()).toBe("public-bucket");
  });

  it("is the main bucket when it names the public bucket", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("R2_PRIVATE_BUCKET_NAME", "public-bucket");
    expect(getPrivateBucketName()).toBe("public-bucket");
  });
});

describe("document storage keys", () => {
  it("are unguessable from the record id, and new on every call", () => {
    expect(receiptPdfKey("rec123")).toMatch(/^private\/documents\/receipts\/rec123-[a-z0-9]{16}\.pdf$/);
    expect(certificatePdfKey("enr456")).toMatch(/^private\/documents\/certificates\/enr456-[a-z0-9]{16}\.pdf$/);
    expect(receiptPdfKey("rec123")).not.toBe(receiptPdfKey("rec123"));
  });

  const enrollment = {
    id: "enr456",
    courseId: "course1",
    certificateGeneratedAt: new Date("2026-01-05T06:30:00Z"),
    certificateNumber: "DQA-CERT/2026/00001",
    certificateType: "COMPLETION",
    certificateGrade: null,
    user: { name: "Aisha Khan", address: null },
  };

  beforeEach(() => {
    vi.mocked(putPrivateObject).mockClear();
    vi.mocked(deletePrivateObject).mockClear();
    Object.assign(prisma, { enrollment: { update: vi.fn(async () => ({})) } });
  });

  it("re-rendering stores under a new key and removes the file it replaces", async () => {
    const previous = "private/documents/certificates/enr456.pdf";
    expect(await storeCertificatePdf({ ...enrollment, certificatePdfKey: previous }, "Tajweed")).toBe(true);

    const [[storedKey]] = vi.mocked(putPrivateObject).mock.calls as unknown as [[string]];
    expect(storedKey).toMatch(/^private\/documents\/certificates\/enr456-[a-z0-9]{16}\.pdf$/);
    expect(prisma.enrollment.update).toHaveBeenCalledWith({ where: { id: "enr456" }, data: { certificatePdfKey: storedKey } });
    expect(deletePrivateObject).toHaveBeenCalledWith(previous);
  });

  it("removing a document deletes the stored key, or the pre-suffix key for an older record", async () => {
    await deleteStoredCertificatePdf({ id: "enr456", certificatePdfKey: "private/documents/certificates/enr456-abc.pdf" });
    await deleteStoredCertificatePdf({ id: "enr456", certificatePdfKey: null });
    expect(vi.mocked(deletePrivateObject).mock.calls).toEqual([
      ["private/documents/certificates/enr456-abc.pdf"],
      ["private/documents/certificates/enr456.pdf"],
    ]);
  });
});
