import { beforeEach, describe, expect, it } from "vitest";
import { getCoursesForTeacherPaginated } from "@/services/teacher-portal";
import { createCourse, createEnrollment, createTeacher, createUser, resetDb, SKIP_WITHOUT_DB } from "../helpers/db";

describe.skipIf(SKIP_WITHOUT_DB)("teacher course list", () => {
  beforeEach(resetDb);

  it("counts students, not pending or rejected applicants", async () => {
    const teacher = await createTeacher();
    const course = await createCourse({ teacherId: teacher.id });
    await createEnrollment((await createUser()).id, course.id);
    await createEnrollment((await createUser()).id, course.id, { status: "completed", statusEnum: "COMPLETED" });
    await createEnrollment((await createUser()).id, course.id, { status: "pending", statusEnum: "PENDING_APPROVAL" });
    await createEnrollment((await createUser()).id, course.id, { status: "rejected", statusEnum: "REJECTED" });

    const { items } = await getCoursesForTeacherPaginated(teacher.id, 1, 10);
    expect(items[0].studentCount).toBe(2);
  });
});
