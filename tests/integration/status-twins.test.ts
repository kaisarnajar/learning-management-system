import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/utils/prisma";
import { createCourse, createEnrollment, createUser, resetDb, SKIP_WITHOUT_DB } from "../helpers/db";

// Migration 20261124000800_status_twin_agreement: a trigger fills a typed
// twin from its text, and a CHECK refuses a twin that contradicts its text.
describe.skipIf(SKIP_WITHOUT_DB)("text and typed status columns stay in agreement", () => {
  beforeEach(resetDb);

  const submission = async (data: Record<string, unknown>) => {
    const student = await createUser();
    const course = await createCourse();
    return prisma.coursePaymentSubmission.create({
      data: { userId: student.id, courseId: course.id, label: "Monthly fee — March 2026", amountInrPaise: 34900, ...data },
    });
  };

  it("a write that sets only the text gets its typed twin", async () => {
    const course = await createCourse();
    const enrollment = await createEnrollment((await createUser()).id, course.id, { status: "Completed", statusEnum: undefined, certificateType: "completion" });
    expect(enrollment).toMatchObject({ statusEnum: "COMPLETED", certificateTypeEnum: "COMPLETION" });

    // The legacy "declined" spelling and the schema defaults map too.
    expect(await submission({ status: "declined", paymentMethod: "UPI" })).toMatchObject({
      statusEnum: "DECLINED",
      paymentTypeEnum: "MONTHLY",
      paymentMethodEnum: "UPI",
    });

    const user = await createUser();
    const device = await prisma.deviceToken.create({ data: { userId: user.id, token: "tok-1", platform: " IOS " } });
    expect(device.platformEnum).toBe("IOS");
  });

  it("text with no mapping is stored with a NULL twin instead of failing", async () => {
    expect(await submission({ status: "on-hold", paymentType: "festival_fee", paymentMethod: "cheque" })).toMatchObject({
      status: "on-hold",
      statusEnum: null,
      paymentTypeEnum: null,
      paymentMethodEnum: null,
    });
    const record = await prisma.paymentRecord.create({
      data: { userId: (await createUser()).id, amountInrPaise: 100, paidAt: new Date(), paymentType: "legacy" },
    });
    expect(record.paymentTypeEnum).toBeNull();
    // An unmapped text puts no constraint on the twin.
    expect(await submission({ status: "on-hold", statusEnum: "APPROVED" })).toMatchObject({ statusEnum: "APPROVED" });
  });

  it("an update of only the text moves the twin with it", async () => {
    const course = await createCourse();
    const enrollment = await createEnrollment((await createUser()).id, course.id);
    const updated = await prisma.enrollment.update({ where: { id: enrollment.id }, data: { status: "rejected" } });
    expect(updated.statusEnum).toBe("REJECTED");

    const unmapped = await prisma.enrollment.update({ where: { id: enrollment.id }, data: { status: "archived" } });
    expect(unmapped.statusEnum).toBeNull();
  });

  it("refuses a twin that contradicts its text", async () => {
    const course = await createCourse();
    await expect(
      createEnrollment((await createUser()).id, course.id, { status: "active", statusEnum: "REJECTED" }),
    ).rejects.toThrow(/Enrollment_statusEnum_agrees_check/);

    const enrollment = await createEnrollment((await createUser()).id, course.id);
    await expect(
      prisma.enrollment.update({ where: { id: enrollment.id }, data: { statusEnum: "COMPLETED" } }),
    ).rejects.toThrow(/Enrollment_statusEnum_agrees_check/);

    const coupon = prisma.coupon.create({
      data: { code: "TWIN1", type: "SPECIAL", percentage: 10, validFrom: new Date(), validUntil: new Date(), gender: "male", genderEnum: "FEMALE" },
    });
    await expect(coupon).rejects.toThrow(/Coupon_genderEnum_agrees_check/);
  });

  it("a legacy fee waiver keeps WAIVER whatever its payment method text says", async () => {
    expect(await submission({ paymentMethod: "upi", paymentMethodEnum: "WAIVER", upiTransactionId: "FEE-WAIVER" })).toMatchObject({
      paymentMethodEnum: "WAIVER",
    });
    await expect(submission({ paymentMethod: "upi", paymentMethodEnum: "WAIVER", upiTransactionId: "UTR1" })).rejects.toThrow(
      /CoursePaymentSubmission_paymentMethodEnum_agrees_check/,
    );
  });
});
