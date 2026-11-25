import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/utils/prisma";
import { GET as appConfig } from "@/app/api/v1/app-config/route";
import { GET as home } from "@/app/api/v1/home/route";
import { POST as contact } from "@/app/api/v1/contact/route";
import { GET as blogById } from "@/app/api/v1/blog/[id]/route";
import { GET as blogComments, POST as addComment } from "@/app/api/v1/blog/[id]/comments/route";
import { POST as toggleLike } from "@/app/api/v1/blog/[id]/like/route";
import { DELETE as deleteComment, PATCH as editComment } from "@/app/api/v1/blog/comments/[commentId]/route";
import { GET as fatwaById } from "@/app/api/v1/fatwa/[id]/route";
import { GET as fatwaList } from "@/app/api/v1/fatwa/route";
import { GET as libraryById } from "@/app/api/v1/library/[id]/route";
import { GET as bookById } from "@/app/api/v1/bookstore/[id]/route";
import { GET as bookList } from "@/app/api/v1/bookstore/route";
import { GET as teacherById } from "@/app/api/v1/teachers/[id]/route";
import { GET as teacherList } from "@/app/api/v1/teachers/route";
import { GET as courseById } from "@/app/api/v1/courses/[id]/route";
import { GET as announcementById } from "@/app/api/v1/announcements/[id]/route";
import { createBook, createCourse, createEnrollment, createTeacher, createUser, resetDb, setPaymentSettings, SKIP_WITHOUT_DB } from "../helpers/db";
import { apiRequest, jsonOf, routeParams, signedInStudent } from "../helpers/api";

async function createPublishedPost(overrides: Record<string, unknown> = {}) {
  const author = await createUser({ name: "Author" });
  return prisma.blogPost.create({
    data: {
      title: "On patience",
      excerpt: "Short",
      body: '<p>Body</p><script>alert(1)</script><img src=x onerror="alert(1)">',
      published: true,
      approvalStatus: "APPROVED",
      createdById: author.id,
      ...overrides,
    },
  });
}

describe.skipIf(SKIP_WITHOUT_DB)("mobile API: public content", () => {
  beforeEach(async () => {
    await resetDb();
    await setPaymentSettings();
  });

  it("app-config describes the brand, policies, lookups and features", async () => {
    const data = await jsonOf(await appConfig());
    expect(data.success).toBe(true);
    expect(data.brand.name).toBeTruthy();
    expect(data.policies.version).toBeTruthy();
    expect(data.lookups.countries.length).toBeGreaterThan(100);
    expect(data.lookups.occupations.length).toBeGreaterThan(0);
    expect(data.features).toEqual(expect.objectContaining({ onlinePayments: expect.any(Boolean) }));
  });

  it("home returns every section, with public projections only", async () => {
    const teacher = await createTeacher({ email: "ustadh@example.test" });
    await createCourse({ teacherId: teacher.id, featuredOnHomepage: true });
    await createBook({ featuredOnHomepage: true });

    const data = await jsonOf(await home());
    expect(data.success).toBe(true);
    expect(data.courses).toHaveLength(1);
    expect(data.courses[0].teacher).not.toHaveProperty("email");
    expect(data.books[0]).not.toHaveProperty("purchasePriceInrPaise");
    for (const key of ["announcements", "blogPosts", "libraryItems", "fatwas", "reviews"]) {
      expect(Array.isArray(data[key])).toBe(true);
    }
  });

  it("never exposes teacher e-mails, book cost prices or fatwa asker e-mails in lists", async () => {
    await createTeacher({ email: "private@example.test" });
    await createBook();
    await prisma.fatwaQuestion.create({
      data: { title: "Q", question: "Q?", category: "General", askerName: "Ali", askerEmail: "asker@example.test", answer: "<p>A</p>", approvalStatus: "APPROVED", answeredAt: new Date() },
    });

    const teachers = await jsonOf(await teacherList(apiRequest("/api/v1/teachers")));
    const books = await jsonOf(await bookList(apiRequest("/api/v1/bookstore")));
    const fatwas = await jsonOf(await fatwaList(apiRequest("/api/v1/fatwa")));

    expect(JSON.stringify(teachers)).not.toContain("private@example.test");
    expect(books.data[0]).not.toHaveProperty("purchasePriceInrPaise");
    expect(books.data[0]).not.toHaveProperty("inventoryPurchased");
    expect(JSON.stringify(fatwas)).not.toContain("asker@example.test");
    expect(fatwas.data[0].askerName).toBe("Ali");
  });

  describe("detail endpoints", () => {
    it("fatwa: answered and approved only, sanitised answer, no e-mail", async () => {
      const answered = await prisma.fatwaQuestion.create({
        data: { title: "Q", question: "Q?", category: "General", askerName: "Ali", askerEmail: "a@example.test", answer: "<p>Yes</p><script>x()</script>", approvalStatus: "APPROVED", answeredAt: new Date() },
      });
      const pending = await prisma.fatwaQuestion.create({
        data: { title: "P", question: "P?", category: "General", askerName: "Ali", askerEmail: "a@example.test" },
      });

      const ok = await jsonOf(await fatwaById(apiRequest(`/api/v1/fatwa/${answered.id}`), routeParams({ id: answered.id })));
      expect(ok.fatwa.answer).toBe("<p>Yes</p>");
      expect(ok.fatwa).not.toHaveProperty("askerEmail");
      expect((await fatwaById(apiRequest(`/api/v1/fatwa/${pending.id}`), routeParams({ id: pending.id }))).status).toBe(404);
    });

    it("library item and book: published only", async () => {
      const item = await prisma.libraryItem.create({ data: { id: "lib-shown", title: "Book", author: "A", topic: "Fiqh", level: "Beginner", language: "English", published: true } });
      const hiddenItem = await prisma.libraryItem.create({ data: { id: "lib-draft", title: "Draft", author: "A", topic: "Fiqh", level: "Beginner", language: "English", published: false } });
      const book = await createBook();
      const hiddenBook = await createBook({ published: false });

      expect((await jsonOf(await libraryById(apiRequest("/x"), routeParams({ id: item.id })))).item.title).toBe("Book");
      expect((await libraryById(apiRequest("/x"), routeParams({ id: hiddenItem.id }))).status).toBe(404);
      const bookData = await jsonOf(await bookById(apiRequest("/x"), routeParams({ id: book.id })));
      expect(bookData.book).not.toHaveProperty("purchasePriceInrPaise");
      expect((await bookById(apiRequest("/x"), routeParams({ id: hiddenBook.id }))).status).toBe(404);
    });

    it("teacher: profile without contact details, and their public courses", async () => {
      const teacher = await createTeacher({ email: "t@example.test" });
      await createCourse({ teacherId: teacher.id });
      await createCourse({ teacherId: teacher.id, status: "DRAFT" });

      const data = await jsonOf(await teacherById(apiRequest(`/api/v1/teachers/${teacher.id}`), routeParams({ id: teacher.id })));
      expect(data.teacher).not.toHaveProperty("email");
      expect(data.courses).toHaveLength(1);
      expect((await teacherById(apiRequest("/x"), routeParams({ id: "missing" }))).status).toBe(404);
    });

    it("site announcement: published only", async () => {
      const shown = await prisma.siteAnnouncement.create({ data: { title: "Eid", body: "Closed", published: true } });
      const hidden = await prisma.siteAnnouncement.create({ data: { title: "Draft", body: "x", published: false } });
      expect((await jsonOf(await announcementById(apiRequest("/x"), routeParams({ id: shown.id })))).announcement.title).toBe("Eid");
      expect((await announcementById(apiRequest("/x"), routeParams({ id: hidden.id }))).status).toBe(404);
    });

    it("course: carries the caller's own enrollment when signed in", async () => {
      const course = await createCourse();
      const me = await signedInStudent();
      await createEnrollment(me.user.id, course.id);

      const anonymous = await jsonOf(await courseById(apiRequest(`/api/v1/courses/${course.id}`), routeParams({ id: course.id })));
      expect(anonymous.enrollment).toBeNull();
      expect(anonymous.enrollmentOpen).toBe(true);

      const mine = await jsonOf(await courseById(apiRequest(`/api/v1/courses/${course.id}`, { headers: me.headers }), routeParams({ id: course.id })));
      expect(mine.enrollment).toMatchObject({ status: "active", enrollmentFeePending: false });
      expect(mine.course.teacher ?? {}).not.toHaveProperty("email");
    });
  });

  describe("blog post, likes and comments", () => {
    it("returns a published post with sanitised body and counts; drafts are 404", async () => {
      const post = await createPublishedPost();
      const draft = await createPublishedPost({ published: false, approvalStatus: "DRAFT" });

      const data = await jsonOf(await blogById(apiRequest(`/api/v1/blog/${post.id}`), routeParams({ id: post.id })));
      expect(data.post.body).toBe('<p>Body</p>');
      expect(data.post).toMatchObject({ likeCount: 0, commentCount: 0, likedByMe: false });
      expect((await blogById(apiRequest("/x"), routeParams({ id: draft.id }))).status).toBe(404);
    });

    it("toggles a like and reports it on the post", async () => {
      const post = await createPublishedPost();
      const me = await signedInStudent();

      const liked = await jsonOf(await toggleLike(apiRequest("/x", { method: "POST", headers: me.headers }), routeParams({ id: post.id })));
      expect(liked).toEqual({ success: true, liked: true, likeCount: 1 });
      const view = await jsonOf(await blogById(apiRequest("/x", { headers: me.headers }), routeParams({ id: post.id })));
      expect(view.post.likedByMe).toBe(true);
      const unliked = await jsonOf(await toggleLike(apiRequest("/x", { method: "POST", headers: me.headers }), routeParams({ id: post.id })));
      expect(unliked).toEqual({ success: true, liked: false, likeCount: 0 });
      expect((await toggleLike(apiRequest("/x", { method: "POST" }), routeParams({ id: post.id }))).status).toBe(401);
    });

    it("adds, lists, edits and deletes a comment; only its author may change it", async () => {
      const post = await createPublishedPost();
      const me = await signedInStudent();
      const other = await signedInStudent();

      const created = await addComment(apiRequest("/x", { method: "POST", headers: me.headers, json: { content: "  JazakAllah  " } }), routeParams({ id: post.id }));
      expect(created.status).toBe(201);
      const { comment } = await jsonOf(created);
      expect(comment).toMatchObject({ content: "JazakAllah", user: { id: me.user.id } });
      expect(comment.user).not.toHaveProperty("email");

      const list = await jsonOf(await blogComments(apiRequest("/x?skip=0"), routeParams({ id: post.id })));
      expect(list.data).toHaveLength(1);
      // The post's author is notified.
      expect(await prisma.studentNotification.count({ where: { type: "BLOG_COMMENT_ADDED" } })).toBe(1);

      expect((await editComment(apiRequest("/x", { method: "PATCH", headers: other.headers, json: { content: "hijack" } }), routeParams({ commentId: comment.id }))).status).toBe(403);
      expect((await deleteComment(apiRequest("/x", { method: "DELETE", headers: other.headers }), routeParams({ commentId: comment.id }))).status).toBe(403);

      const edited = await jsonOf(await editComment(apiRequest("/x", { method: "PATCH", headers: me.headers, json: { content: "Edited" } }), routeParams({ commentId: comment.id })));
      expect(edited.comment.content).toBe("Edited");
      expect((await deleteComment(apiRequest("/x", { method: "DELETE", headers: me.headers }), routeParams({ commentId: comment.id }))).status).toBe(200);
      expect(await prisma.blogComment.count()).toBe(0);
    });

    it("never shows a commenter's e-mail to the post's author (L9)", async () => {
      const post = await createPublishedPost();
      for (const name of [null, "   "]) {
        const commenter = await signedInStudent({ name });
        const response = await addComment(apiRequest("/x", { method: "POST", headers: commenter.headers, json: { content: "Beneficial" } }), routeParams({ id: post.id }));
        expect(response.status).toBe(201);
      }

      const notifications = await prisma.studentNotification.findMany({ where: { type: "BLOG_COMMENT_ADDED" } });
      expect(notifications).toHaveLength(2);
      for (const notification of notifications) {
        expect(`${notification.title} ${notification.body}`).not.toContain("@");
        expect(notification.body).toMatch(/^A reader commented/);
      }
    });

    it("rejects empty comments", async () => {
      const post = await createPublishedPost();
      const me = await signedInStudent();
      expect((await addComment(apiRequest("/x", { method: "POST", headers: me.headers, json: { content: "   " } }), routeParams({ id: post.id }))).status).toBe(400);
    });
  });

  describe("contact", () => {
    it("stores a message from a guest and validates it", async () => {
      const ok = await contact(apiRequest("/api/v1/contact", { method: "POST", json: { name: "Guest", email: "guest@example.test", phone: "+91 98765 43210", message: "When does the next course start?" } }));
      expect(ok.status).toBe(201);
      expect(await prisma.contactInquiry.findFirst()).toMatchObject({ email: "guest@example.test", phone: "919876543210", userId: null });

      const bad = await contact(apiRequest("/api/v1/contact", { method: "POST", json: { name: "", email: "nope", message: "" } }));
      expect(bad.status).toBe(400);
    });

    it("links a signed-in sender's message to the account", async () => {
      const me = await signedInStudent();
      const ok = await contact(apiRequest("/api/v1/contact", { method: "POST", headers: me.headers, json: { message: "Please call me back about fees." } }));
      expect(ok.status).toBe(201);
      expect(await prisma.contactInquiry.findFirst()).toMatchObject({ userId: me.user.id, email: me.user.email });
    });
  });
});
