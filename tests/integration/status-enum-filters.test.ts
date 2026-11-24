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
    // The text says pending, the typed twin says active: the roster follows the twin.
    const typedActive = await createEnrollment((await createUser()).id, course.id, { status: "pending_approval", statusEnum: "ACTIVE" });
    await createEnrollment((await createUser()).id, course.id, { status: "active", statusEnum: "PENDING_APPROVAL" });

    const roster = await getApprovedEnrollmentsForCoursePaginated(course.id, 1, 20);
    expect(roster.items.map((e) => e.id)).toEqual([typedActive.id]);
  });

  it("the pending-payment count follows the typed status", async () => {
    const student = await createUser();
    const course = await createCourse();
    await prisma.coursePaymentSubmission.create({
      data: { userId: student.id, courseId: course.id, label: "Monthly fee — March 2026", amountInrPaise: 34900, status: "approved", statusEnum: "PENDING_VERIFICATION" },
    });
    expect(await getPendingPaymentCount()).toBe(1);
  });

  it("the backfill check counts rows whose typed twin is missing", async () => {
    const course = await createCourse();
    const enrollment = await createEnrollment((await createUser()).id, course.id);
    expect(await gapFor("Enrollment", "statusEnum")).toBe(0);

    await prisma.enrollment.update({ where: { id: enrollment.id }, data: { statusEnum: null } });
    expect(await gapFor("Enrollment", "statusEnum")).toBe(1);
    // A NULL text (no certificate yet) is not a gap.
    expect(await gapFor("Enrollment", "certificateTypeEnum")).toBe(0);
  });
});
