import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/utils/prisma";
import { getStudentCount, getStudentUsersPaginated } from "@/services/students";
import { createTeacher, createUser, resetDb, SKIP_WITHOUT_DB } from "../helpers/db";

/**
 * The admin student list hides admin accounts only. Teachers stay listed:
 * at the academy teachers also enrol and pay fees as students, and hiding
 * them (as a dev release briefly did) made 5 of 61 students disappear.
 */
describe.skipIf(SKIP_WITHOUT_DB)("admin student list", () => {
  beforeEach(resetDb);

  it("lists students and teachers' own accounts, but not admins or deleted accounts", async () => {
    await createUser({ email: "admin@example.test", name: "Admin" });
    const student = await createUser({ name: "Plain Student" });
    const teacherAccount = await createUser({ email: "ustadh@example.test", name: "Ustadh Student" });
    await createTeacher({ email: "ustadh@example.test" });
    await createUser({ name: "Gone", deletedAt: new Date() });

    const { items, totalCount } = await getStudentUsersPaginated(1, 50);
    const ids = items.map((u: { id: string }) => u.id).sort();

    expect(ids).toEqual([student.id, teacherAccount.id].sort());
    expect(totalCount).toBe(2);
    expect(await getStudentCount()).toBe(2);
    expect(await prisma.user.count()).toBe(4);
  });
});
