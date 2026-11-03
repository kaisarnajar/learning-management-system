import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/utils/prisma";
import {
  createStudentNotification,
  createStudentNotificationsForUsers,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  notifyAllStudentsOfSiteAnnouncement,
  notifyEnrolledStudentsOfCourseAnnouncement,
  notifyPaymentApproved,
} from "@/services/notifications";
import { createCourse, createEnrollment, createTeacher, createUser, resetDb, SKIP_WITHOUT_DB } from "../helpers/db";

describe.skipIf(SKIP_WITHOUT_DB)("notification fan-out and de-duplication", () => {
  beforeEach(resetDb);

  const base = {
    type: "COURSE_ANNOUNCEMENT" as const,
    title: "Schedule change",
    href: "/profile/courses/x/announcements",
    sourceType: "CourseAnnouncement",
  };

  it("keeps one row per (user, type, source) and re-surfaces it as unread when it is updated", async () => {
    const user = await createUser();
    await createStudentNotification({ ...base, userId: user.id, sourceId: "a1" });
    const [first] = await prisma.studentNotification.findMany({ where: { userId: user.id } });
    await markNotificationRead(user.id, first.id);
    expect(await getUnreadNotificationCount(user.id)).toBe(0);

    await createStudentNotification({ ...base, userId: user.id, title: "Schedule change (updated)", sourceId: "a1" });

    const rows = await prisma.studentNotification.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: "Schedule change (updated)", readAt: null });
    expect(await getUnreadNotificationCount(user.id)).toBe(1);
  });

  it("creates distinct rows for different sources and types", async () => {
    const user = await createUser();
    await createStudentNotification({ ...base, userId: user.id, sourceId: "a1" });
    await createStudentNotification({ ...base, userId: user.id, sourceId: "a2" });
    await createStudentNotification({ ...base, userId: user.id, type: "PERSONAL_MESSAGE", sourceId: "a1" });

    expect(await prisma.studentNotification.count({ where: { userId: user.id } })).toBe(3);
  });

  it("allows repeated notifications that have no source", async () => {
    const user = await createUser();
    await createStudentNotification({ ...base, userId: user.id });
    await createStudentNotification({ ...base, userId: user.id });

    expect(await prisma.studentNotification.count({ where: { userId: user.id } })).toBe(2);
  });

  it("fans out to many users once, even with duplicate ids or a repeated run", async () => {
    const users = await Promise.all(Array.from({ length: 12 }, () => createUser()));
    const ids = users.map((u) => u.id);

    await createStudentNotificationsForUsers([...ids, ...ids.slice(0, 3)], { ...base, sourceId: "a1" });
    await createStudentNotificationsForUsers(ids, { ...base, sourceId: "a1" });

    expect(await prisma.studentNotification.count()).toBe(12);
    const perUser = await prisma.studentNotification.groupBy({ by: ["userId"], _count: true });
    expect(perUser.every((row) => row._count === 1)).toBe(true);
  });

  it("does nothing for an empty audience", async () => {
    await createStudentNotificationsForUsers([], { ...base, sourceId: "a1" });
    expect(await prisma.studentNotification.count()).toBe(0);
  });

  it("notifies the enrolled students of a course announcement once and skips pending requests", async () => {
    const course = await createCourse();
    const active = await createUser();
    const pending = await createUser();
    const outsider = await createUser();
    await createEnrollment(active.id, course.id);
    await createEnrollment(pending.id, course.id, { status: "pending_approval", statusEnum: "PENDING_APPROVAL" });

    const announcement = { courseId: course.id, courseTitle: course.title, announcementId: "ann-1", title: "Hello", body: "Class at 6pm" };
    await notifyEnrolledStudentsOfCourseAnnouncement(announcement);
    await notifyEnrolledStudentsOfCourseAnnouncement(announcement);

    const rows = await prisma.studentNotification.findMany();
    expect(rows.map((r) => r.userId)).toEqual([active.id]);
    expect(rows.some((r) => r.userId === pending.id || r.userId === outsider.id)).toBe(false);
  });

  it("sends a site announcement to every non-teacher account except deleted ones", async () => {
    const student = await createUser();
    const removed = await createUser({ deletedAt: new Date() });
    const teacherUser = await createUser({ email: "teacher@example.test" });
    await createTeacher({ email: "teacher@example.test", userId: teacherUser.id });

    await notifyAllStudentsOfSiteAnnouncement({ announcementId: "site-1", title: "Eid", body: "Eid Mubarak to all students." });
    await notifyAllStudentsOfSiteAnnouncement({ announcementId: "site-1", title: "Eid", body: "Eid Mubarak to all students." });

    const recipients = (await prisma.studentNotification.findMany()).map((r) => r.userId);
    expect(recipients).toEqual([student.id]);
    expect(recipients).not.toContain(removed.id);
    expect(recipients).not.toContain(teacherUser.id);
  });

  it("de-duplicates payment-approved notifications for the same submission", async () => {
    const user = await createUser();
    const payment = { userId: user.id, courseTitle: "Tajweed", sourceId: "sub-1", sourceType: "CoursePaymentSubmission" as const };

    await notifyPaymentApproved(payment);
    await notifyPaymentApproved(payment);

    expect(await prisma.studentNotification.count({ where: { userId: user.id, type: "PAYMENT_APPROVED" } })).toBe(1);
  });

  it("marks only the owner's notifications as read", async () => {
    const [a, b] = [await createUser(), await createUser()];
    await createStudentNotification({ ...base, userId: a.id, sourceId: "x1" });
    await createStudentNotification({ ...base, userId: b.id, sourceId: "x1" });
    const [ofA] = await prisma.studentNotification.findMany({ where: { userId: a.id } });

    await markNotificationRead(b.id, ofA.id);
    expect(await getUnreadNotificationCount(a.id)).toBe(1);

    await markAllNotificationsRead(a.id);
    expect(await getUnreadNotificationCount(a.id)).toBe(0);
    expect(await getUnreadNotificationCount(b.id)).toBe(1);
  });
});
