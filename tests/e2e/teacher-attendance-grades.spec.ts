import { expect, test } from "@playwright/test";
import { AUTH_STATE, db, FIXTURES, hasDatabase } from "./support/db";
import { rowWith, signIn } from "./support/ui";

test.skip(!hasDatabase, "DATABASE_URL_TEST is not set");
test.use({ storageState: AUTH_STATE.teacher });

const COURSE = `/teacher/courses/${FIXTURES.course.id}`;

test.describe("teacher portal", () => {
  test("takes attendance and the student sees it", async ({ page, browser }) => {
    await page.goto(`${COURSE}/attendance/new`);
    await page.locator("#attendance-date").fill("2026-03-10");
    await rowWith(page, FIXTURES.classmate.name).getByRole("button", { name: "Absent" }).click();
    await page.getByRole("button", { name: /save attendance/i }).click();
    await page.waitForURL(`**${COURSE}/attendance`);

    const records = await db().courseAttendanceRecord.findMany({
      where: { attendance: { courseId: FIXTURES.course.id } },
      include: { enrollment: { include: { user: true } } },
    });
    const classmate = records.find((r) => r.enrollment.user.email === FIXTURES.classmate.email);
    expect(classmate?.isPresent).toBe(false);
    expect(records.every((r) => r.attendanceId === records[0].attendanceId)).toBe(true);

    const student = await browser.newContext();
    const studentPage = await student.newPage();
    await signIn(studentPage, FIXTURES.classmate.email);
    await studentPage.goto(`/profile/courses/${FIXTURES.course.id}/attendance`);
    await expect(studentPage.getByText(/absent/i).first()).toBeVisible();
    await student.close();
  });

  test("records marks on a grade card and the student sees them", async ({ page, browser }) => {
    await page.goto(`${COURSE}/grades/new`);
    await page.locator("#exam-title").fill("Mid-Term");
    await page.locator("#exam-date").fill("2026-03-12");
    await page.locator("#max-marks").fill("50");
    await page.getByLabel(`Marks for ${FIXTURES.classmate.name}`).fill("42");
    await page.getByRole("button", { name: /save grades/i }).click();
    await page.waitForURL(`**${COURSE}/grades`);

    const record = await db().courseGradeRecord.findFirstOrThrow({
      where: { enrollment: { user: { email: FIXTURES.classmate.email } } },
      include: { grade: true },
    });
    expect(record.grade).toMatchObject({ title: "Mid-Term", maxMarks: 50 });
    expect(record.marksObtained).toBe(42);
    // students left blank are "not graded", not zero
    expect(await db().courseGradeRecord.count({ where: { gradeId: record.gradeId } })).toBe(1);

    const student = await browser.newContext();
    const studentPage = await student.newPage();
    await signIn(studentPage, FIXTURES.classmate.email);
    await studentPage.goto(`/profile/courses/${FIXTURES.course.id}/grades`);
    await expect(studentPage.getByText("Mid-Term").first()).toBeVisible();
    await expect(studentPage.getByText("42").first()).toBeVisible();
    await student.close();
  });

  test("cannot open another teacher's course", async ({ page }) => {
    const otherUser = await db().user.create({ data: { email: "other.teacher@e2e.test", name: "Other Teacher", emailVerified: new Date() } });
    const other = await db().teacher.create({
      data: { id: "e2e-other-teacher", name: "Other Teacher", email: otherUser.email, userId: otherUser.id, specialization: "Fiqh", bio: "Teaches fiqh for the tests." , initials: "OT" },
    });
    const course = await db().course.create({
      data: { id: "e2e-other-course", title: "Someone Else's Course", description: "Not this teacher's course.", startDate: "2026-04-01", duration: "3 months", level: "Beginner", category: "Fiqh", priceInrPaise: 0, monthlyFeeInrPaise: 0, status: "ONGOING", teacherId: other.id },
    });

    const response = await page.goto(`/teacher/courses/${course.id}/attendance`);

    expect(response?.status()).toBe(404);
    await expect(page.getByText("Someone Else's Course")).toHaveCount(0);
  });
});
