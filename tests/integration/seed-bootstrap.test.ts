import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/utils/prisma";
import { seedBootstrap } from "@/prisma/seed-bootstrap";
import { resetDb, SKIP_WITHOUT_DB } from "../helpers/db";

/** `npm run db:seed` is documented as safe to re-run against a live database (H10). */
describe.skipIf(SKIP_WITHOUT_DB)("bootstrap seed", () => {
  beforeEach(resetDb);

  it("creates the catalogue once and never overwrites an admin's edits", async () => {
    await seedBootstrap(prisma);
    const course = await prisma.course.findFirstOrThrow({ orderBy: { id: "asc" } });
    const teacher = await prisma.teacher.findFirstOrThrow({ orderBy: { id: "asc" } });
    const library = await prisma.libraryItem.findFirstOrThrow({ orderBy: { id: "asc" } });
    const slab = await prisma.shippingChargeSlab.findFirstOrThrow({ orderBy: { id: "asc" } });
    const counts = { courses: await prisma.course.count(), teachers: await prisma.teacher.count() };

    await prisma.course.update({
      where: { id: course.id },
      data: { title: "Renamed by the admin", priceInrPaise: 123400, status: "ON_HOLD", featuredOnHomepage: false },
    });
    await prisma.teacher.update({ where: { id: teacher.id }, data: { bio: "Edited bio" } });
    await prisma.libraryItem.update({ where: { id: library.id }, data: { title: "Edited title" } });
    await prisma.shippingChargeSlab.update({ where: { id: slab.id }, data: { chargeInrPaise: 1 } });
    await prisma.paymentSettings.update({ where: { id: "default" }, data: { upiId: "academy@bank" } });

    await seedBootstrap(prisma);

    expect(await prisma.course.findUniqueOrThrow({ where: { id: course.id } })).toMatchObject({
      title: "Renamed by the admin",
      priceInrPaise: 123400,
      status: "ON_HOLD",
      featuredOnHomepage: false,
    });
    expect((await prisma.teacher.findUniqueOrThrow({ where: { id: teacher.id } })).bio).toBe("Edited bio");
    expect((await prisma.libraryItem.findUniqueOrThrow({ where: { id: library.id } })).title).toBe("Edited title");
    expect((await prisma.shippingChargeSlab.findUniqueOrThrow({ where: { id: slab.id } })).chargeInrPaise).toBe(1);
    expect((await prisma.paymentSettings.findUniqueOrThrow({ where: { id: "default" } })).upiId).toBe("academy@bank");
    expect({ courses: await prisma.course.count(), teachers: await prisma.teacher.count() }).toEqual(counts);
  });

  it("creates no coupons, users or reviews", async () => {
    await seedBootstrap(prisma);

    expect(await prisma.coupon.count()).toBe(0);
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.studentReview.count()).toBe(0);
  });
});
