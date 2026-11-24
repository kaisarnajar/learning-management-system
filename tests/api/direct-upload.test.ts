import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/services/auth";
import { POST as requestUpload } from "@/app/api/uploads/route";
import { UPLOAD_KINDS, type UploadKind } from "@/config/constants/direct-upload";
import { createCourse, createTeacher, createUser, resetDb, sessionFor, SKIP_WITHOUT_DB } from "../helpers/db";
import { jsonOf } from "../helpers/api";

// Never call R2: the presigner returns a placeholder URL.
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(async () => "https://r2.example.test/presigned"),
}));

const FILE_FOR: Record<UploadKind, { contentType: string; size: number }> = {
  "course-announcement-attachment": { contentType: "application/pdf", size: 6 * 1024 * 1024 },
  "blog-image": { contentType: "image/png", size: 1024 },
  "site-announcement-image": { contentType: "image/jpeg", size: 1024 },
  "library-cover": { contentType: "image/webp", size: 1024 },
  "book-cover": { contentType: "image/png", size: 1024 },
};

function post(body: unknown, contentType = "application/json") {
  return requestUpload(new Request("http://localhost:3000/api/uploads", {
    method: "POST",
    headers: { "content-type": contentType },
    body: JSON.stringify(body),
  }));
}

async function statusFor(kind: UploadKind, courseId?: string) {
  return (await post({ kind, ...FILE_FOR[kind], ...(courseId ? { courseId } : {}) })).status;
}

describe.skipIf(SKIP_WITHOUT_DB)("presigned uploads (/api/uploads)", () => {
  beforeEach(resetDb);

  it("refuses signed-out visitors", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    expect(await statusFor("blog-image")).toBe(401);
  });

  it("refuses every kind to a student", async () => {
    const student = await createUser();
    vi.mocked(auth).mockResolvedValue(sessionFor(student, "STUDENT") as never);
    const course = await createCourse();
    for (const kind of UPLOAD_KINDS) expect(await statusFor(kind, course.id), kind).toBe(403);
  });

  it("lets a teacher upload blog images and attachments for their own course only", async () => {
    const user = await createUser({ email: "teacher-upload@example.test" });
    const teacher = await createTeacher({ email: user.email, userId: user.id });
    const own = await createCourse({ teacherId: teacher.id });
    const other = await createCourse();
    vi.mocked(auth).mockResolvedValue(sessionFor(user, "TEACHER") as never);

    expect(await statusFor("blog-image")).toBe(200);
    expect(await statusFor("course-announcement-attachment", own.id)).toBe(200);
    expect(await statusFor("course-announcement-attachment", other.id)).toBe(403);
    expect(await statusFor("course-announcement-attachment")).toBe(403);
    expect(await statusFor("site-announcement-image")).toBe(403);
    expect(await statusFor("library-cover")).toBe(403);
    expect(await statusFor("book-cover")).toBe(403);
  });

  it("lets an admin upload every kind and returns a staging key scoped to them", async () => {
    const admin = await createUser({ email: process.env.ADMIN_EMAIL });
    vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);
    const course = await createCourse();
    for (const kind of UPLOAD_KINDS) expect(await statusFor(kind, course.id), kind).toBe(200);

    const body = await jsonOf(await post({ kind: "course-announcement-attachment", ...FILE_FOR["course-announcement-attachment"], courseId: course.id }));
    expect(body.key).toMatch(new RegExp(`^staging/course-announcement-attachment/${admin.id}/[0-9a-f-]{36}$`));
    expect(body.uploadUrl).toBe("https://r2.example.test/presigned");
    expect(body.headers).toEqual({ "Content-Type": "application/pdf" });
  });

  it("answers 400 for an unknown kind or a file the kind refuses, and 415 for a non-JSON body", async () => {
    const admin = await createUser({ email: process.env.ADMIN_EMAIL });
    vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);

    expect((await post({ kind: "avatar", contentType: "image/png", size: 10 })).status).toBe(400);
    const wrongType = await post({ kind: "blog-image", contentType: "text/html", size: 10 });
    expect(wrongType.status).toBe(400);
    expect((await jsonOf(wrongType)).error).toMatch(/must be JPEG/);
    expect((await post({ kind: "blog-image", contentType: "image/png", size: 50 * 1024 * 1024 })).status).toBe(400);
    expect((await post({ kind: "blog-image", contentType: "image/png", size: 10 }, "text/plain")).status).toBe(415);
  });
});
