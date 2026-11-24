import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { GET as openFile } from "@/app/api/files/[...key]/route";
import { createCourse, createEnrollment, createTeacher, createUser, resetDb, sessionFor, SKIP_WITHOUT_DB } from "../helpers/db";
import { apiRequest, bearerFor, signedInAdmin, signedInStudent, signedInTeacher } from "../helpers/api";

// Presigning needs no network, but stub it so the redirect target is predictable.
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(async (_client: unknown, command: { input: { Key: string } }) => `https://r2.example.test/${command.input.Key}?X-Amz-Signature=sig`),
}));

const SCREENSHOT = "/api/files/private/payments/user-1732400000000-k3j9x.png";
const ATTACHMENT = "/api/files/private/announcements/course-1732400000000-a8b7c.pdf";
const PRIVATE_NOTE = "/api/files/private/announcements/course-1732400000000-p1q2r.pdf";

/** GET the file route for an app path, as the browser or the app would. */
function open(path: string, headers: Record<string, string> = {}) {
  const segments = path.replace("/api/files/", "").split("/");
  return openFile(apiRequest(path, { headers }), { params: Promise.resolve({ key: segments }) });
}

function expectPresigned(response: Response, key: string) {
  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe(`https://r2.example.test/${key}?X-Amz-Signature=sig`);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
}

describe.skipIf(SKIP_WITHOUT_DB)("GET /api/files/private/** authorization", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(auth).mockResolvedValue(null as never);
  });

  it("asks a signed-out visitor to sign in", async () => {
    expect((await open(SCREENSHOT)).status).toBe(401);
  });

  describe("payment screenshots", () => {
    async function submittedScreenshot() {
      const owner = await createUser();
      const course = await createCourse();
      await prisma.coursePaymentSubmission.create({
        data: { userId: owner.id, courseId: course.id, label: "Monthly fee — January 2026", amountInrPaise: 34900, paymentScreenshotPath: SCREENSHOT },
      });
      return owner;
    }

    it("the owner gets a presigned URL, on the website and in the app", async () => {
      const owner = await submittedScreenshot();
      vi.mocked(auth).mockResolvedValue(sessionFor(owner, "STUDENT") as never);
      expectPresigned(await open(SCREENSHOT), "private/payments/user-1732400000000-k3j9x.png");

      vi.mocked(auth).mockResolvedValue(null as never);
      expectPresigned(await open(SCREENSHOT, await bearerFor(owner)), "private/payments/user-1732400000000-k3j9x.png");
    });

    it("another student gets 404, the same as for a missing file", async () => {
      await submittedScreenshot();
      const other = await signedInStudent();
      expect((await open(SCREENSHOT, other.headers)).status).toBe(404);

      vi.mocked(auth).mockResolvedValue(sessionFor(other.user, "STUDENT") as never);
      expect((await open(SCREENSHOT)).status).toBe(404);
      expect((await open("/api/files/private/payments/missing-1.png")).status).toBe(404);
    });

    it("an admin gets a presigned URL for a screenshot that exists, and 404 otherwise", async () => {
      await submittedScreenshot();
      const admin = await signedInAdmin();
      expectPresigned(await open(SCREENSHOT, admin.headers), "private/payments/user-1732400000000-k3j9x.png");
      expect((await open("/api/files/private/payments/missing-1.png", admin.headers)).status).toBe(404);
    });

    it("a teacher has no access to payment screenshots", async () => {
      await submittedScreenshot();
      const teacher = await signedInTeacher();
      expect((await open(SCREENSHOT, teacher.headers)).status).toBe(404);
    });
  });

  describe("announcement attachments", () => {
    async function courseWithAttachments() {
      const teacher = await signedInTeacher();
      const course = await createCourse({ teacherId: teacher.teacher.id });
      const studentA = await signedInStudent();
      const studentB = await signedInStudent();
      await createEnrollment(studentA.user.id, course.id);
      const enrollmentB = await createEnrollment(studentB.user.id, course.id);
      await prisma.courseAnnouncement.create({
        data: { courseId: course.id, teacherId: teacher.teacher.id, authorName: "Teacher", category: "STUDY_MATERIALS", title: "Notes", body: "See the attachment.", attachmentPath: ATTACHMENT, attachmentName: "notes.pdf" },
      });
      await prisma.courseAnnouncement.create({
        data: {
          courseId: course.id,
          enrollmentId: enrollmentB.id,
          teacherId: teacher.teacher.id,
          authorName: "Teacher",
          category: "GENERAL_NOTICE",
          title: "Your feedback",
          body: "Only for student B.",
          attachmentPath: PRIVATE_NOTE,
          attachmentName: "feedback.pdf",
        },
      });
      return { teacher, course, studentA, studentB };
    }

    it("the course's teacher and its enrolled students get a presigned URL", async () => {
      const { teacher, studentA } = await courseWithAttachments();
      expectPresigned(await open(ATTACHMENT, teacher.headers), "private/announcements/course-1732400000000-a8b7c.pdf");
      expectPresigned(await open(ATTACHMENT, studentA.headers), "private/announcements/course-1732400000000-a8b7c.pdf");
    });

    it("a teacher of another course gets 404", async () => {
      await courseWithAttachments();
      const other = await signedInTeacher();
      await createCourse({ teacherId: other.teacher.id });
      expect((await open(ATTACHMENT, other.headers)).status).toBe(404);
    });

    it("the author loses access once the course moves to another teacher (L12)", async () => {
      const { teacher, course } = await courseWithAttachments();
      const successor = await signedInTeacher();
      await prisma.course.update({ where: { id: course.id }, data: { teacherId: successor.teacher.id } });

      expect((await open(ATTACHMENT, teacher.headers)).status).toBe(404);
      const webSession = sessionFor(teacher.user, "TEACHER");
      vi.mocked(auth).mockResolvedValue({ ...webSession, user: { ...webSession.user, teacherId: teacher.teacher.id } } as never);
      expect((await open(ATTACHMENT)).status).toBe(404);
      vi.mocked(auth).mockResolvedValue(null as never);

      expectPresigned(await open(ATTACHMENT, successor.headers), "private/announcements/course-1732400000000-a8b7c.pdf");
    });

    it("a teacher whose profile is matched by e-mail is recognised whatever its case", async () => {
      const { course } = await courseWithAttachments();
      const user = await createUser({ email: "Mixed.Case@Example.test" });
      const profile = await createTeacher({ email: "mixed.case@example.test" });
      await prisma.course.update({ where: { id: course.id }, data: { teacherId: profile.id } });

      expectPresigned(await open(ATTACHMENT, await bearerFor(user, "TEACHER")), "private/announcements/course-1732400000000-a8b7c.pdf");
    });

    it("a student who is not enrolled, or whose enrollment is not approved, gets 404", async () => {
      const { course } = await courseWithAttachments();
      const outsider = await signedInStudent();
      expect((await open(ATTACHMENT, outsider.headers)).status).toBe(404);

      const pending = await signedInStudent();
      await createEnrollment(pending.user.id, course.id, { status: "awaiting_enrollment_fee", statusEnum: "AWAITING_ENROLLMENT_FEE" });
      expect((await open(ATTACHMENT, pending.headers)).status).toBe(404);
    });

    it("a private message to student B is not readable by student A", async () => {
      const { studentA, studentB } = await courseWithAttachments();
      expect((await open(PRIVATE_NOTE, studentA.headers)).status).toBe(404);
      expectPresigned(await open(PRIVATE_NOTE, studentB.headers), "private/announcements/course-1732400000000-p1q2r.pdf");
    });

    it("an admin gets a presigned URL", async () => {
      await courseWithAttachments();
      const admin = await signedInAdmin();
      expectPresigned(await open(PRIVATE_NOTE, admin.headers), "private/announcements/course-1732400000000-p1q2r.pdf");
    });
  });

  it("answers 404 for malformed or traversal keys, before looking at the viewer", async () => {
    const admin = await createUser({ email: process.env.ADMIN_EMAIL });
    vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);
    for (const path of [
      "/api/files/private/payments/../announcements/x.pdf",
      "/api/files/private/payments/..",
      "/api/files/private/payments/a/b.png",
      "/api/files/private/Payments/x.png",
      "/api/files/private/payments/x%2F..%2Fy.png",
      "/api/files/public/payments/x.png",
      "/api/files/private/payments/",
    ]) {
      const response = await open(path);
      expect(response.status, path).toBe(404);
    }
    // A well-formed key under a prefix the route does not serve is refused too.
    expect((await open("/api/files/private/receipts/receipt-1.pdf")).status).toBe(404);
  });

  it("an unverified address with a teacher profile is treated as a student", async () => {
    const teacher = await createTeacher({ email: "pending.teacher@example.test" });
    const course = await createCourse({ teacherId: teacher.id });
    await prisma.courseAnnouncement.create({
      data: { courseId: course.id, authorName: "Teacher", category: "STUDY_MATERIALS", title: "Notes", body: "See the attachment.", attachmentPath: ATTACHMENT },
    });
    const squatter = await signedInStudent({ email: "pending.teacher@example.test", emailVerified: null });
    expect((await open(ATTACHMENT, squatter.headers)).status).toBe(404);
  });
});
