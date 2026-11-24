import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/utils/prisma";
import { getApprovedEnrollmentsForCoursePaginated } from "@/services/enrollments";
import { getPendingPaymentCount } from "@/services/monthly-payments";
import { findStatusBackfillGaps } from "@/scripts/lib/status-backfill";
import { createCourse, createEnrollment, createUser, resetDb, SKIP_WITHOUT_DB } from "../helpers/db";

const gapFor = async (table: string, typed: string) =>
  (await findStatusBackfillGaps(prisma)).find((gap) => gap.table === table && gap.typed === typed)!.missing;

describe.skipIf(SKIP_WITHOUT_DB)("status filters read the typed columns", () => {
  beforeEach(resetDb);

  it("an enrollment is listed by its typed status, not its legacy text", async () => {
    const course = await createCourse();
    // The text has no mapping, the typed twin says active: the roster follows the twin.
    // (A text that maps must agree with its twin since migration 20261124000800.)
    const typedActive = await createEnrollment((await createUser()).id, course.id, { status: "legacy-unknown", statusEnum: "ACTIVE" });
    await createEnrollment((await createUser()).id, course.id, { status: "legacy-active", statusEnum: "PENDING_APPROVAL" });

    const roster = await getApprovedEnrollmentsForCoursePaginated(course.id, 1, 20);
    expect(roster.items.map((e) => e.id)).toEqual([typedActive.id]);
  });

  it("the pending-payment count follows the typed status", async () => {
    const student = await createUser();
    const course = await createCourse();
    await prisma.coursePaymentSubmission.create({
      data: { userId: student.id, courseId: course.id, label: "Monthly fee — March 2026", amountInrPaise: 34900, status: "legacy-pending", statusEnum: "PENDING_VERIFICATION" },
    });
    expect(await getPendingPaymentCount()).toBe(1);
  });

  it("the backfill check counts rows whose typed twin is missing", async () => {
    const course = await createCourse();
    const enrollment = await createEnrollment((await createUser()).id, course.id);
    expect(await gapFor("Enrollment", "statusEnum")).toBe(0);

    // The twin trigger refills a NULL twin, so make the gap with triggers off,
    // as rows written before migration 20261124000800 could be.
    await prisma.$transaction([
      prisma.$executeRaw`SET LOCAL session_replication_role = replica`,
      prisma.enrollment.update({ where: { id: enrollment.id }, data: { statusEnum: null } }),
    ]);
    expect(await gapFor("Enrollment", "statusEnum")).toBe(1);
    // A NULL text (no certificate yet) is not a gap.
    expect(await gapFor("Enrollment", "certificateTypeEnum")).toBe(0);
  });

  it("the backfill check counts twins that disagree with their text", async () => {
    const course = await createCourse();
    const enrollment = await createEnrollment((await createUser()).id, course.id);
    const mismatchedIn = async (client: Pick<typeof prisma, "$queryRaw">) =>
      (await findStatusBackfillGaps(client)).find((gap) => gap.table === "Enrollment" && gap.typed === "statusEnum")!.mismatched;
    expect(await mismatchedIn(prisma)).toBe(0);

    // Only rows written before the CHECK constraint can disagree: make one with
    // the constraint dropped inside a transaction that is rolled back.
    const rolledBack = prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_statusEnum_agrees_check"`);
      await tx.enrollment.update({ where: { id: enrollment.id }, data: { statusEnum: "REJECTED" } });
      expect(await mismatchedIn(tx)).toBe(1);
      throw new Error("roll back");
    });
    await expect(rolledBack).rejects.toThrow("roll back");
    expect(await mismatchedIn(prisma)).toBe(0);
  });
});
