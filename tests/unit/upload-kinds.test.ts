import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { storedObjectOf, UPLOAD_KIND_DEFINITIONS } from "@/services/upload-kinds";
import { deleteUpload, saveUpload } from "@/services/uploads";
import { privateKeyFromPath } from "@/services/storage";
import { UPLOAD_KINDS } from "@/config/constants/direct-upload";

// Staged uploads (which need a session) are covered by tests/integration/direct-uploads.test.ts.
vi.mock("@/services/auth", () => ({ auth: vi.fn(async () => null) }));
// R2 is never called: the client is a stand-in.
const send = vi.fn<(command: unknown) => Promise<object>>(async () => ({}));
vi.mock("@/utils/s3", () => ({
  getR2Client: () => ({ send }),
  getPrivateBucketName: () => "private-bucket",
  R2_BUCKET_NAME: "public-bucket",
  R2_PUBLIC_URL: "https://cdn.example.test",
}));

const OLD_SITE_IMAGE = "https://cdn.example.test/uploads/announcements/ann1-1732400000000-ab12cd.png";
const NEW_SITE_IMAGE = "https://cdn.example.test/uploads/site-announcements/ann1-1764000000000-ef34gh.png";
const ATTACHMENT = "/api/files/private/announcements/course-1732400000000-a8b7c.pdf";

const deleted = () =>
  send.mock.calls.map(([command]) => command as unknown).filter((c): c is DeleteObjectCommand => c instanceof DeleteObjectCommand).map((c) => c.input);

beforeEach(() => {
  send.mockClear();
  // Stored URLs are recognised by the environment's bases (config/storage-urls.ts).
  vi.stubEnv("R2_PUBLIC_URL", "https://cdn.example.test");
});

describe("the upload kinds table", () => {
  it("covers every direct-upload kind, with its access rule", () => {
    for (const kind of UPLOAD_KINDS) expect(UPLOAD_KIND_DEFINITIONS[kind]).toHaveProperty("access");
  });

  it("stores new site-announcement images apart from course attachments", async () => {
    const png = await sharp({ create: { width: 40, height: 20, channels: 3, background: "#000" } }).png().toBuffer();
    const file = new File([new Uint8Array(png)], "poster.png", { type: "image/png" });
    const url = await saveUpload("site-announcement-image", "ann1", file);
    expect(url).toMatch(/^https:\/\/cdn\.example\.test\/uploads\/site-announcements\/ann1-\d+-[a-z0-9]+\.webp$/);
    const put = send.mock.calls.map(([command]) => command as unknown).find((c): c is PutObjectCommand => c instanceof PutObjectCommand)!;
    expect(put.input).toMatchObject({ Bucket: "public-bucket", Key: expect.stringMatching(/^uploads\/site-announcements\//) });
  });
});

describe("deleting stored files by kind", () => {
  it("still deletes a site-announcement image stored under the old prefix", async () => {
    await deleteUpload("site-announcement-image", OLD_SITE_IMAGE);
    await deleteUpload("site-announcement-image", NEW_SITE_IMAGE);
    expect(deleted()).toEqual([
      { Bucket: "public-bucket", Key: "uploads/announcements/ann1-1732400000000-ab12cd.png" },
      { Bucket: "public-bucket", Key: "uploads/site-announcements/ann1-1764000000000-ef34gh.png" },
    ]);
  });

  it("never lets one announcement kind delete the other's files", async () => {
    // Both used to resolve through the shared "announcements" prefix.
    expect(storedObjectOf("site-announcement-image", ATTACHMENT)).toBeNull();
    expect(storedObjectOf("course-announcement-attachment", OLD_SITE_IMAGE)).toBeNull();
    expect(storedObjectOf("course-announcement-attachment", NEW_SITE_IMAGE)).toBeNull();
    await deleteUpload("site-announcement-image", ATTACHMENT);
    await deleteUpload("course-announcement-attachment", OLD_SITE_IMAGE);
    expect(deleted()).toEqual([]);
  });

  it("still deletes a course attachment, from the private bucket", async () => {
    await deleteUpload("course-announcement-attachment", ATTACHMENT);
    expect(deleted()).toEqual([{ Bucket: "private-bucket", Key: "private/announcements/course-1732400000000-a8b7c.pdf" }]);
  });

  it("leaves URLs that are not ours alone", async () => {
    await deleteUpload("blog-image", "https://elsewhere.example/uploads/blogs/x.png");
    await deleteUpload("blog-image", OLD_SITE_IMAGE);
    expect(deleted()).toEqual([]);
  });
});

describe("private file paths (/api/files)", () => {
  it("accept existing keys and hyphenated folders, nothing that escapes them", () => {
    expect(privateKeyFromPath(ATTACHMENT)).toBe("private/announcements/course-1732400000000-a8b7c.pdf");
    expect(privateKeyFromPath("/api/files/private/payments/sub-1.png")).toBe("private/payments/sub-1.png");
    expect(privateKeyFromPath("/api/files/private/site-announcements/a.png")).toBe("private/site-announcements/a.png");
    expect(privateKeyFromPath("/api/files/private/payments/../announcements/x.pdf")).toBeNull();
    expect(privateKeyFromPath("/api/files/private/-x/a.png")).toBeNull();
  });
});
