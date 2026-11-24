import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateTag } from "next/cache";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { deleteStudentUser } from "@/app/admin/students/actions";
import { deleteOwnAccount } from "@/services/account-deletion";
import { PUBLIC_CONTENT_TAG } from "@/services/public-cache";
import { getFeaturedHomepageReviewCount, getFeaturedHomepageReviews } from "@/services/student-reviews";
import { createUser, resetDb, sessionFor, SKIP_WITHOUT_DB } from "../helpers/db";

async function featuredReview(userId: string) {
  return prisma.studentReview.create({
    data: { userId, quote: "A wonderful teacher and a patient course.", rating: 5, status: "APPROVED", featuredOnHomepage: true, featuredAt: new Date() },
  });
}

/** Deleted users leave the homepage, and the public cache is dropped at once (review L19). */
describe.skipIf(SKIP_WITHOUT_DB)("public content cache and deleted users", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(updateTag).mockClear();
    const admin = await createUser({ email: "admin@example.test", name: "Admin" });
    vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);
  });

  it("leaves a deleted user's featured review off the homepage", async () => {
    const kept = await createUser({ name: "Aisha" });
    const gone = await createUser({ name: "Bilal" });
    await featuredReview(kept.id);
    await featuredReview(gone.id);
    await prisma.user.update({ where: { id: gone.id }, data: { deletedAt: new Date() } });

    const reviews = await getFeaturedHomepageReviews();
    expect(reviews).toHaveLength(1);
    expect(JSON.stringify(reviews)).not.toContain("Bilal");
    expect(await getFeaturedHomepageReviewCount()).toBe(1);
  });

  it("drops the public cache when a student deletes their own account", async () => {
    const student = await createUser();
    await featuredReview(student.id);

    expect(await deleteOwnAccount(student.id, { confirm: "DELETE" })).toEqual({ ok: true });

    expect(updateTag).toHaveBeenCalledWith(PUBLIC_CONTENT_TAG);
    expect(await getFeaturedHomepageReviews()).toHaveLength(0);
  });

  it("drops the public cache when an admin deletes a student", async () => {
    const student = await createUser();

    expect((await deleteStudentUser(student.id)).success).toBeTruthy();

    expect(updateTag).toHaveBeenCalledWith(PUBLIC_CONTENT_TAG);
  });
});
