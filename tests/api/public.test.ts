import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/utils/prisma";
import { GET as announcements } from "@/app/api/v1/announcements/route";
import { GET as blog } from "@/app/api/v1/blog/route";
import { GET as bookstore } from "@/app/api/v1/bookstore/route";
import { GET as courses } from "@/app/api/v1/courses/route";
import { GET as courseById } from "@/app/api/v1/courses/[id]/route";
import { GET as dailyInspiration } from "@/app/api/v1/daily-inspiration/route";
import { GET as fatwa, POST as askFatwa } from "@/app/api/v1/fatwa/route";
import { GET as library } from "@/app/api/v1/library/route";
import { GET as occupations } from "@/app/api/v1/occupations/route";
import { GET as paymentSettings } from "@/app/api/v1/payment-settings/route";
import { GET as teachers } from "@/app/api/v1/teachers/route";
import { createBook, createCourse, createEnrollment, createTeacher, createUser, resetDb, setPaymentSettings, SKIP_WITHOUT_DB } from "../helpers/db";
import { apiRequest, bearer, jsonOf, routeParams, signedInStudent } from "../helpers/api";

type ListHandler = (request: ReturnType<typeof apiRequest>) => Promise<Response>;

describe.skipIf(SKIP_WITHOUT_DB)("public /api/v1 routes", () => {
  beforeEach(resetDb);

  describe("paginated lists", () => {
    const LISTS: Array<[string, ListHandler, string]> = [
      ["announcements", announcements, "/api/v1/announcements"],
      ["blog", blog, "/api/v1/blog"],
      ["bookstore", bookstore, "/api/v1/bookstore"],
      ["courses", courses, "/api/v1/courses"],
      ["fatwa", fatwa, "/api/v1/fatwa"],
      ["library", library, "/api/v1/library"],
      ["teachers", teachers, "/api/v1/teachers"],
    ];

    it.each(LISTS)("%s answers an empty list in the standard envelope", async (_name, handler, path) => {
      const response = await handler(apiRequest(path));

      expect(response.status).toBe(200);
      expect(await jsonOf(response)).toEqual({ success: true, data: [], totalCount: 0, page: 1, pageSize: 20 });
    });

    it.each(LISTS)("%s clamps page and pageSize", async (_name, handler, path) => {
      const huge = await jsonOf(await handler(apiRequest(`${path}?page=0&pageSize=100000`)));
      expect(huge).toMatchObject({ page: 1, pageSize: 50 });

      const tiny = await jsonOf(await handler(apiRequest(`${path}?page=-4&pageSize=0`)));
      expect(tiny).toMatchObject({ page: 1, pageSize: 1 });

      const junk = await jsonOf(await handler(apiRequest(`${path}?page=abc&pageSize=xyz`)));
      expect(junk).toMatchObject({ page: 1, pageSize: 20 });
    });

    it.each(LISTS)("%s needs no credentials and ignores Authorization headers", async (_name, handler, path) => {
      expect((await handler(apiRequest(path, { headers: { authorization: "Bearer garbage" } }))).status).toBe(200);
    });

    it("pages through results", async () => {
      for (let i = 0; i < 5; i++) await createTeacher({ name: `Teacher ${i}` });

      const first = await jsonOf(await teachers(apiRequest("/api/v1/teachers?pageSize=2&page=1")));
      const last = await jsonOf(await teachers(apiRequest("/api/v1/teachers?pageSize=2&page=3")));

      expect(first.totalCount).toBe(5);
      expect(first.data).toHaveLength(2);
      expect(last.data).toHaveLength(1);
    });
  });

  describe("visibility", () => {
    it("lists only published teachers", async () => {
      await createTeacher({ name: "Visible Teacher" });
      await createTeacher({ name: "Hidden Teacher", published: false });

      const data = await jsonOf(await teachers(apiRequest("/api/v1/teachers")));

      expect(data.data.map((t: { name: string }) => t.name)).toEqual(["Visible Teacher"]);
    });

    it("lists every course except drafts, and filters by category and search", async () => {
      await createCourse({ title: "Tajweed Basics", category: "Quran" });
      await createCourse({ title: "Arabic Grammar", category: "Arabic" });
      await createCourse({ title: "Secret Draft", status: "DRAFT" });

      const all = await jsonOf(await courses(apiRequest("/api/v1/courses")));
      expect(all.data.map((c: { title: string }) => c.title).sort()).toEqual(["Arabic Grammar", "Tajweed Basics"]);

      const arabic = await jsonOf(await courses(apiRequest("/api/v1/courses?category=Arabic")));
      expect(arabic.data.map((c: { title: string }) => c.title)).toEqual(["Arabic Grammar"]);

      const search = await jsonOf(await courses(apiRequest("/api/v1/courses?search=tajweed")));
      expect(search.totalCount).toBe(1);
    });

    it("lists only published books", async () => {
      await createBook({ title: "Shown" });
      await createBook({ title: "Hidden", published: false });

      const data = await jsonOf(await bookstore(apiRequest("/api/v1/bookstore")));

      expect(data.data.map((b: { title: string }) => b.title)).toEqual(["Shown"]);
    });

    it("lists only published site announcements", async () => {
      await prisma.siteAnnouncement.create({ data: { title: "Open day", body: "Come along", published: true } });
      await prisma.siteAnnouncement.create({ data: { title: "Draft notice", body: "Not yet", published: false } });

      const data = await jsonOf(await announcements(apiRequest("/api/v1/announcements")));

      expect(data.data.map((a: { title: string }) => a.title)).toEqual(["Open day"]);
    });

    it("lists only published and approved blog posts", async () => {
      await prisma.blogPost.create({ data: { title: "Live post", body: "Body text here", published: true, approvalStatus: "APPROVED" } });
      await prisma.blogPost.create({ data: { title: "Unpublished", body: "Body text here", published: false, approvalStatus: "APPROVED" } });
      await prisma.blogPost.create({ data: { title: "Awaiting review", body: "Body text here", published: true, approvalStatus: "PENDING" } });

      const data = await jsonOf(await blog(apiRequest("/api/v1/blog")));

      expect(data.data.map((p: { title: string }) => p.title)).toEqual(["Live post"]);
    });

    it("lists only published library items", async () => {
      await prisma.libraryItem.create({ data: { id: "lib-1", title: "Shown", author: "A", topic: "Fiqh", level: "Beginner", language: "English", published: true } });
      await prisma.libraryItem.create({ data: { id: "lib-2", title: "Hidden", author: "A", topic: "Fiqh", level: "Beginner", language: "English", published: false } });

      const data = await jsonOf(await library(apiRequest("/api/v1/library")));

      expect(data.data.map((i: { title: string }) => i.title)).toEqual(["Shown"]);
    });

    it("lists only answered and approved fatwas", async () => {
      const base = { askerName: "Asker", askerEmail: "asker@example.test", category: "Prayer", question: "x".repeat(40) };
      await prisma.fatwaQuestion.create({ data: { ...base, title: "Answered one", answer: "The answer", answeredAt: new Date(), approvalStatus: "APPROVED" } });
      await prisma.fatwaQuestion.create({ data: { ...base, title: "Unanswered", approvalStatus: "APPROVED" } });
      await prisma.fatwaQuestion.create({ data: { ...base, title: "Pending answer", answer: "Draft answer", approvalStatus: "PENDING" } });

      const data = await jsonOf(await fatwa(apiRequest("/api/v1/fatwa")));

      expect(data.data.map((f: { title: string }) => f.title)).toEqual(["Answered one"]);
    });
  });

  describe("fatwa questions", () => {
    const question = { title: "Is this allowed in Islam?", question: "x".repeat(40), category: "Prayer", askerName: "Ali", askerEmail: "ali@example.test" };

    it("accepts a question as pending review", async () => {
      const response = await askFatwa(apiRequest("/api/v1/fatwa", { method: "POST", json: question }));

      expect(response.status).toBe(200);
      expect(await prisma.fatwaQuestion.findFirstOrThrow()).toMatchObject({ approvalStatus: "PENDING", title: question.title });
    });

    it("validates the question and rate-limits a network", async () => {
      expect((await askFatwa(apiRequest("/api/v1/fatwa", { method: "POST", json: { ...question, title: "short" } }))).status).toBe(400);
      expect((await askFatwa(apiRequest("/api/v1/fatwa", { method: "POST", json: { ...question, askerEmail: "bad" } }))).status).toBe(400);

      const statuses: number[] = [];
      for (let i = 0; i < 6; i++) {
        statuses.push((await askFatwa(apiRequest("/api/v1/fatwa", { method: "POST", ip: "198.51.100.7", json: question }))).status);
      }
      expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
      expect(statuses[5]).toBe(429);
    });
  });

  describe("static and settings routes", () => {
    it("lists the occupations", async () => {
      const data = await jsonOf(await occupations());
      expect(data.success).toBe(true);
      expect(data.data).toContainEqual({ value: "STUDENT", label: "Student" });
    });

    it("returns the daily inspiration (or none)", async () => {
      const empty = await jsonOf(await dailyInspiration(apiRequest("/api/v1/daily-inspiration")));
      expect(empty).toMatchObject({ success: true });

      await prisma.dailyInspiration.create({ data: { kind: "QURAN", arabicText: "نص", englishTranslation: "Text", published: true } });
      const data = await jsonOf(await dailyInspiration(apiRequest("/api/v1/daily-inspiration")));
      expect(data.inspiration).toMatchObject({ englishTranslation: "Text" });
    });

    it("exposes payment details for paying but not internal switches", async () => {
      await setPaymentSettings({ upiId: "academy@bank", bankName: "Bank", includeGstByDefault: true, autoApproveFullWaivers: true, feeWaiverEnabled: true });

      const data = await jsonOf(await paymentSettings(apiRequest("/api/v1/payment-settings")));

      expect(data.settings).toMatchObject({ upiId: "academy@bank", bankName: "Bank", feeWaiverEnabled: true });
      expect(data.settings).not.toHaveProperty("includeGstByDefault");
      expect(data.settings).not.toHaveProperty("autoApproveFullWaivers");
    });
  });

  describe("course detail and announcement visibility", () => {
    async function courseWithAnnouncement() {
      const course = await createCourse();
      await prisma.courseAnnouncement.create({
        data: { courseId: course.id, authorName: "Teacher", category: "GENERAL_NOTICE", title: "Class moved", body: "Now at 7pm" },
      });
      return course;
    }
    const detail = (courseId: string, headers: Record<string, string> = {}) =>
      courseById(apiRequest(`/api/v1/courses/${courseId}`, { headers }), routeParams({ id: courseId }));

    it("answers 404 for unknown and draft courses", async () => {
      expect((await detail("missing")).status).toBe(404);
      const draft = await createCourse({ status: "DRAFT" });
      expect((await detail(draft.id)).status).toBe(404);
    });

    it("hides course announcements from anonymous callers, outsiders and pending applicants", async () => {
      const course = await courseWithAnnouncement();
      const outsider = await signedInStudent();
      const pending = await signedInStudent();
      await createEnrollment(pending.user.id, course.id, { status: "pending_approval", statusEnum: "PENDING_APPROVAL" });
      const unpaid = await signedInStudent();
      await createEnrollment(unpaid.user.id, course.id, { status: "awaiting_enrollment_fee", statusEnum: "AWAITING_ENROLLMENT_FEE" });

      for (const headers of [{}, outsider.headers, pending.headers, unpaid.headers]) {
        const data = await jsonOf(await detail(course.id, headers));
        expect(data.success).toBe(true);
        expect(data.announcements).toEqual([]);
      }
    });

    it("shows course announcements to approved students only (and not a stale token)", async () => {
      const course = await courseWithAnnouncement();
      const student = await signedInStudent();
      await createEnrollment(student.user.id, course.id);

      const data = await jsonOf(await detail(course.id, student.headers));
      expect(data.announcements.map((a: { title: string }) => a.title)).toEqual(["Class moved"]);

      const garbage = await jsonOf(await detail(course.id, bearer("not-a-token")));
      expect(garbage.announcements).toEqual([]);
    });

    it("does not include announcements addressed to one student for other students", async () => {
      const course = await createCourse();
      const mine = await signedInStudent();
      const other = await createUser();
      const myEnrollment = await createEnrollment(mine.user.id, course.id);
      await createEnrollment(other.id, course.id);
      await prisma.courseAnnouncement.create({
        data: { courseId: course.id, enrollmentId: myEnrollment.id, authorName: "Teacher", category: "GENERAL_NOTICE", title: "Private note", body: "Only for one student" },
      });

      const data = await jsonOf(await detail(course.id, mine.headers));

      expect(data.announcements).toEqual([]);
    });
  });
});
