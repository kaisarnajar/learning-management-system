import { beforeEach, describe, expect, it, vi } from "vitest";
import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { createCourseAnnouncement } from "@/services/course-announcement-actions";
import { addImagesToPost } from "@/services/blog-mutations";
import { createBook } from "@/app/admin/bookstore/actions";
import { createCourse, createTeacher, createUser, resetDb, runAction, sessionFor, SKIP_WITHOUT_DB } from "../helpers/db";

/**
 * The forms submit the staging keys of files the browser already PUT to R2
 * (5.24); the actions verify and move them instead of reading a File. R2 is a
 * stand-in that knows the staged objects below.
 */
const staged = new Map<string, { type: string; bytes: Buffer; size?: number }>();
const send = vi.fn(async (command: unknown) => {
  if (command instanceof HeadObjectCommand) {
    const object = staged.get(command.input.Key!);
    if (!object) throw Object.assign(new Error("not found"), { name: "NotFound" });
    return { ContentLength: object.size ?? object.bytes.length, ContentType: object.type };
  }
  if (command instanceof GetObjectCommand) {
    const object = staged.get(command.input.Key!)!;
    // A ranged read (type sniffing) or the whole object (public images are re-encoded).
    const bytes = command.input.Range ? object.bytes.subarray(0, 32) : object.bytes;
    return { Body: { transformToByteArray: async () => new Uint8Array(bytes) } };
  }
  if (command instanceof DeleteObjectCommand) staged.delete(command.input.Key!);
  return {};
});
vi.mock("@/utils/s3", () => ({
  getR2Client: () => ({ send }),
  getPrivateBucketName: () => "private-bucket",
  R2_BUCKET_NAME: "public-bucket",
  R2_PUBLIC_URL: "https://cdn.example.test",
}));

const PDF = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n");
const PNG = await sharp({ create: { width: 64, height: 32, channels: 3, background: "#123456" } }).png().toBuffer();
let counter = 0;
function stage(kind: string, ownerId: string, type: string, bytes: Buffer, size?: number) {
  counter += 1;
  const key = `staging/${kind}/${ownerId}/00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`;
  staged.set(key, { type, bytes, size });
  return key;
}
const commands = <T>(type: new (...args: never[]) => T): T[] =>
  send.mock.calls.map(([command]) => command).filter((command): command is T => command instanceof type);

function announcementForm(fields: Record<string, string>) {
  const form = new FormData();
  form.set("category", "COURSE_ANNOUNCEMENT");
  form.set("title", "Week 3 notes");
  form.set("body", "The notes for this week are attached.");
  for (const [name, value] of Object.entries(fields)) form.append(name, value);
  return form;
}

describe.skipIf(SKIP_WITHOUT_DB)("direct uploads submitted as keys", () => {
  beforeEach(async () => {
    await resetDb();
    staged.clear();
    send.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  async function signedInTeacherWithCourse() {
    const user = await createUser({ email: `teacher-${Date.now()}@example.test` });
    const teacher = await createTeacher({ email: user.email, userId: user.id });
    const course = await createCourse({ teacherId: teacher.id });
    vi.mocked(auth).mockResolvedValue(sessionFor(user, "TEACHER") as never);
    return { user, course };
  }

  it("a teacher's announcement records a 6 MB PDF uploaded straight to R2", async () => {
    const { user, course } = await signedInTeacherWithCourse();
    const key = stage("course-announcement-attachment", user.id, "application/pdf", PDF, 6 * 1024 * 1024);

    const { redirectedTo } = await runAction(() =>
      createCourseAnnouncement(course.id, announcementForm({ attachmentKey: key, attachmentKeyName: "week-3.pdf" })),
    );

    expect(redirectedTo).toBe(`/teacher/courses/${course.id}/announcements?posted=1`);
    const row = await prisma.courseAnnouncement.findFirstOrThrow({ where: { courseId: course.id } });
    expect(row.attachmentPath).toMatch(new RegExp(`^/api/files/private/announcements/${course.id}-\\d+-[a-z0-9-]+\\.pdf$`));
    expect(row.attachmentName).toBe("week-3.pdf");
    expect(commands(CopyObjectCommand)[0].input).toMatchObject({ Bucket: "private-bucket", CopySource: `private-bucket/${key}` });
    expect(commands(PutObjectCommand)).toHaveLength(0);
    expect(staged.has(key)).toBe(false);
  });

  it("refuses a key issued to someone else, and records nothing", async () => {
    const { course } = await signedInTeacherWithCourse();
    const other = await createUser();
    const key = stage("course-announcement-attachment", other.id, "application/pdf", PDF);

    const { redirectedTo } = await runAction(() => createCourseAnnouncement(course.id, announcementForm({ attachmentKey: key })));

    expect(redirectedTo).toMatch(new RegExp(`^/teacher/courses/${course.id}/announcements/new\\?error=`));
    expect(await prisma.courseAnnouncement.count()).toBe(0);
    expect(send).not.toHaveBeenCalled();
    expect(staged.has(key)).toBe(true);
  });

  it("refuses a staged file whose bytes are not what it claims, and deletes it", async () => {
    const { user, course } = await signedInTeacherWithCourse();
    const key = stage("course-announcement-attachment", user.id, "application/pdf", Buffer.from("<html><body>not a pdf</body></html>"));

    const { redirectedTo } = await runAction(() => createCourseAnnouncement(course.id, announcementForm({ attachmentKey: key })));

    expect(decodeURIComponent(redirectedTo ?? "")).toMatch(/content does not match its type/);
    expect(await prisma.courseAnnouncement.count()).toBe(0);
    expect(commands(CopyObjectCommand)).toHaveLength(0);
    expect(staged.has(key)).toBe(false);
  });

  it("blog images arrive as keys and are recorded with their public URLs", async () => {
    const admin = await createUser({ email: "admin@example.test" });
    vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);
    const post = await prisma.blogPost.create({ data: { title: "Post", body: "<p>Body</p>" } });
    const form = new FormData();
    form.append("imagesKey", stage("blog-image", admin.id, "image/png", PNG));
    form.append("imagesKey", stage("blog-image", admin.id, "image/png", PNG));

    expect(await addImagesToPost(post.id, form, 0)).toEqual({ error: undefined });

    const images = await prisma.blogImage.findMany({ where: { blogPostId: post.id }, orderBy: { sortOrder: "asc" } });
    expect(images.map((image) => image.sortOrder)).toEqual([0, 1]);
    for (const image of images) expect(image.imagePath).toMatch(new RegExp(`^https://cdn\\.example\\.test/uploads/blogs/${post.id}-[a-z0-9-]+\\.webp$`));
  });

  it("a book cover arrives as a key; a key for another kind is refused", async () => {
    const admin = await createUser({ email: "admin@example.test" });
    vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);
    const form = (imageKey: string) => {
      const f = new FormData();
      for (const [name, value] of Object.entries({ title: "Tafsir", author: "Ibn Kathir", description: "A classic tafsir.", priceInr: "500", mrpInr: "600", purchasePriceInr: "300", inventoryPurchased: "10", weightInGrams: "500", status: "AVAILABLE", published: "true" })) f.set(name, value);
      f.set("imageKey", imageKey);
      return f;
    };

    const wrongKind = await runAction(() => createBook(form(stage("blog-image", admin.id, "image/png", PNG))));
    expect(wrongKind.value).toEqual({ error: expect.stringMatching(/could not be found/) });
    expect(await prisma.book.count()).toBe(0);

    const created = await runAction(() => createBook(form(stage("book-cover", admin.id, "image/png", PNG))));
    expect(created.redirectedTo).toBe("/admin/bookstore?created=1");
    const book = await prisma.book.findFirstOrThrow();
    expect(book.imagePath).toMatch(/^https:\/\/cdn\.example\.test\/uploads\/books\/book-[a-z0-9-]+\.webp$/);
  });
});
