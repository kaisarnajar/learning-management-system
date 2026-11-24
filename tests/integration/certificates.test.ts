import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { deleteCertificate, generateCertificate } from "@/app/actions/certificates";
import { getCoursesAwaitingCertificates, getEnrollmentsAwaitingCertificatePaginated } from "@/services/certificates-admin";
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

describe.skipIf(SKIP_WITHOUT_DB)("certificates: who can be certified", () => {
  beforeEach(async () => {
    await resetDb();
    await loginAsAdmin();
  });

  const STATUSES = {
    PENDING_APPROVAL: "pending_approval",
    AWAITING_ENROLLMENT_FEE: "awaiting_enrollment_fee",
    REJECTED: "rejected",
    ACTIVE: "active",
    COMPLETED: "completed",
  } as const;

  const enrollmentIn = async (statusEnum: keyof typeof STATUSES, courseId?: string, user: Record<string, unknown> = {}) => {
    const student = await createUser(user);
    const course = courseId ? { id: courseId } : await createCourse();
    return createEnrollment(student.id, course.id, { status: STATUSES[statusEnum], statusEnum });
  };

  it.each(["PENDING_APPROVAL", "AWAITING_ENROLLMENT_FEE", "REJECTED"] as const)(
    "refuses any certificate for a %s enrollment and uses no number",
    async (status) => {
      const enrollment = await enrollmentIn(status);

      expect(await generateCertificate(enrollment.id, "COMPLETION", 8)).toEqual({ error: expect.stringContaining("completed") });
      expect(await generateCertificate(enrollment.id, "APPRECIATION")).toEqual({ error: expect.stringContaining("active or completed") });

      expect(await prisma.documentSequence.count()).toBe(0);
      const after = await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } });
      expect(after).toMatchObject({ certificateNumber: null, certificateGeneratedAt: null });
    },
  );

  it("an active enrollment gets an appreciation certificate but not a completion one", async () => {
    const enrollment = await enrollmentIn("ACTIVE");

    expect(await generateCertificate(enrollment.id, "COMPLETION", 8)).toEqual({ error: expect.stringContaining("completed") });
    expect(await prisma.documentSequence.count()).toBe(0);

    const result = await generateCertificate(enrollment.id, "APPRECIATION");
    expect(result).toMatchObject({ success: expect.any(String), certificateNumber: expect.any(String) });
  });

  it("lists only active or completed enrollments of live students without a certificate, a page at a time", async () => {
    const course = await createCourse({ title: "Arabic I" });
    const other = await createCourse({ title: "Fiqh I" });
    const active = await enrollmentIn("ACTIVE", course.id, { name: "Bilal" });
    const completed = await enrollmentIn("COMPLETED", course.id, { name: "Aisha" });
    await enrollmentIn("PENDING_APPROVAL", course.id, { name: "Pending" });
    await enrollmentIn("AWAITING_ENROLLMENT_FEE", course.id, { name: "Awaiting" });
    await enrollmentIn("REJECTED", course.id, { name: "Rejected" });
    await enrollmentIn("ACTIVE", course.id, { name: "Deleted", deletedAt: new Date() });
    const certified = await enrollmentIn("COMPLETED", course.id, { name: "Certified" });
    await prisma.enrollment.update({ where: { id: certified.id }, data: { certificateNumber: "DQA-CERT/2026-27/00009", certificateGeneratedAt: new Date() } });
    await enrollmentIn("REJECTED", other.id);

    expect(await getCoursesAwaitingCertificates()).toEqual([{ id: course.id, title: "Arabic I" }]);

    const all = await getEnrollmentsAwaitingCertificatePaginated(1, 50);
    expect(all.totalCount).toBe(2);
    expect(all.items.map((e) => [e.id, e.status])).toEqual([[completed.id, "COMPLETED"], [active.id, "ACTIVE"]]);

    const firstPage = await getEnrollmentsAwaitingCertificatePaginated(1, 1, { courseId: course.id });
    const secondPage = await getEnrollmentsAwaitingCertificatePaginated(2, 1, { courseId: course.id });
    expect([firstPage.items.length, secondPage.items.length, firstPage.totalCount]).toEqual([1, 1, 2]);
    expect(secondPage.items[0]!.id).toBe(active.id);

    const search = await getEnrollmentsAwaitingCertificatePaginated(1, 50, { searchQuery: "bil" });
    expect(search.items.map((e) => e.id)).toEqual([active.id]);
    expect((await getEnrollmentsAwaitingCertificatePaginated(1, 50, { courseId: other.id })).totalCount).toBe(0);
  });
});
