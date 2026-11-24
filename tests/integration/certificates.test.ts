import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { deleteCertificate, generateCertificate } from "@/app/actions/certificates";
import { createCourse, createEnrollment, createUser, resetDb, sessionFor, SKIP_WITHOUT_DB } from "../helpers/db";

// No Chromium here: storing and removing the rendered PDF is not under test.
vi.mock("@/services/documents", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/documents")>()),
  storeCertificatePdf: vi.fn(async () => true),
  deleteStoredCertificatePdf: vi.fn(async () => undefined),
}));

async function loginAsAdmin() {
  const admin = await createUser({ email: "admin@example.test", name: "Admin" });
  vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);
  return admin;
}

describe.skipIf(SKIP_WITHOUT_DB)("certificates: delete and regenerate", () => {
  beforeEach(async () => {
    await resetDb();
    await loginAsAdmin();
  });

  it("deleting a certificate keeps its number, regenerating reissues it, and both are audited", async () => {
    const student = await createUser();
    const course = await createCourse();
    const enrollment = await createEnrollment(student.id, course.id, { status: "completed", statusEnum: "COMPLETED" });

    const first = await generateCertificate(enrollment.id, "COMPLETION", 8);
    expect(first.certificateNumber).toBeTruthy();

    expect(await deleteCertificate(enrollment.id)).toEqual({ success: "Certificate deleted successfully." });
    const deleted = await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } });
    expect(deleted).toMatchObject({ certificateNumber: first.certificateNumber, certificateGeneratedAt: null, certificateGrade: null });

    const second = await generateCertificate(enrollment.id, "COMPLETION", 9);
    expect(second.certificateNumber).toBe(first.certificateNumber);
    expect(await prisma.documentSequence.findMany()).toEqual([expect.objectContaining({ kind: "certificate", next: 1 })]);

    const audit = await prisma.auditLog.findMany({ where: { entity: "Certificate", entityId: enrollment.id }, orderBy: { createdAt: "asc" } });
    expect(audit.map((e) => e.action)).toEqual(["delete", "generate"]);
    expect(audit[0]!.before).toMatchObject({ certificateNumber: first.certificateNumber, certificateGrade: 8 });
    expect(audit[1]!.after).toMatchObject({ certificateNumber: first.certificateNumber, reissued: true, certificateGrade: 9 });
  });
});
