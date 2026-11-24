import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createUploadUrl, DIRECT_UPLOAD_URL_TTL_SECONDS, finalizeUpload, isStagedKeyFor } from "@/services/direct-upload";
import { UploadError } from "@/services/storage";

// R2 is never called: the client and the presigner are stand-ins.
const send = vi.fn();
vi.mock("@/utils/s3", () => ({
  getR2Client: () => ({ send }),
  getPrivateBucketName: () => "private-bucket",
  R2_BUCKET_NAME: "public-bucket",
  R2_PUBLIC_URL: "https://cdn.example.test",
}));
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(async () => "https://r2.example.test/presigned"),
}));

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(24)]);
const PDF = Buffer.from("%PDF-1.7\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\n");
const OWNER = "user_123";
const stagedKey = (kind: string, owner = OWNER) => `staging/${kind}/${owner}/0f8fad5b-d9cb-469f-a165-70867728950e`;

/** Answers HEAD and the ranged GET like R2 would for one staged object. */
function stagedObject(head: { ContentLength?: number; ContentType?: string }, bytes: Buffer) {
  send.mockImplementation(async (command: unknown) => {
    if (command instanceof HeadObjectCommand) return head;
    if (command instanceof GetObjectCommand) return { Body: { transformToByteArray: async () => new Uint8Array(bytes) } };
    return {};
  });
}

const sent = <T>(type: new (...args: never[]) => T): T[] =>
  send.mock.calls.map(([command]) => command).filter((command): command is T => command instanceof type);

beforeEach(() => {
  send.mockReset();
  vi.mocked(getSignedUrl).mockClear();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("createUploadUrl", () => {
  it("signs a short-lived PUT for a server-chosen staging key, bound to the type and exact size", async () => {
    const ticket = await createUploadUrl("blog-image", OWNER, { contentType: "image/png", size: 1234 });

    expect(ticket.key).toMatch(/^staging\/blog-image\/user_123\/[0-9a-f-]{36}$/);
    expect(ticket).toMatchObject({ uploadUrl: "https://r2.example.test/presigned", headers: { "Content-Type": "image/png" }, expiresIn: DIRECT_UPLOAD_URL_TTL_SECONDS });
    expect(DIRECT_UPLOAD_URL_TTL_SECONDS).toBeLessThanOrEqual(600);

    const [, command, options] = vi.mocked(getSignedUrl).mock.calls[0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect((command as PutObjectCommand).input).toEqual({ Bucket: "private-bucket", Key: ticket.key, ContentType: "image/png", ContentLength: 1234 });
    expect(options?.expiresIn).toBe(DIRECT_UPLOAD_URL_TTL_SECONDS);
    expect([...(options?.signableHeaders ?? [])].sort()).toEqual(["content-length", "content-type"]);
  });

  it("issues a new key every time", async () => {
    const a = await createUploadUrl("book-cover", OWNER, { contentType: "image/jpeg", size: 10 });
    const b = await createUploadUrl("book-cover", OWNER, { contentType: "image/jpeg", size: 10 });
    expect(a.key).not.toBe(b.key);
  });

  it.each([
    ["a type the kind does not allow", "blog-image", "application/pdf", 1000, /must be JPEG, PNG, WEBP or GIF/],
    ["a file over the kind's limit", "blog-image", "image/png", 5 * 1024 * 1024 + 1, /5 MB or smaller/],
    ["an empty file", "course-announcement-attachment", "application/pdf", 0, /empty/],
    ["a size that is not a whole number", "library-cover", "image/png", 1.5, /empty/],
  ] as const)("refuses %s without signing anything", async (_, kind, contentType, size, message) => {
    await expect(createUploadUrl(kind, OWNER, { contentType, size })).rejects.toThrow(message);
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it("refuses an owner id that could escape the staging prefix", async () => {
    await expect(createUploadUrl("blog-image", "../other", { contentType: "image/png", size: 10 })).rejects.toBeInstanceOf(UploadError);
  });
});

describe("isStagedKeyFor", () => {
  it("accepts only keys issued to that owner for that kind", () => {
    expect(isStagedKeyFor("blog-image", OWNER, stagedKey("blog-image"))).toBe(true);
    expect(isStagedKeyFor("blog-image", "someone-else", stagedKey("blog-image"))).toBe(false);
    expect(isStagedKeyFor("book-cover", OWNER, stagedKey("blog-image"))).toBe(false);
    expect(isStagedKeyFor("blog-image", OWNER, "uploads/blogs/x.png")).toBe(false);
    expect(isStagedKeyFor("blog-image", OWNER, `${stagedKey("blog-image")}/../../x`)).toBe(false);
  });
});

describe("finalizeUpload", () => {
  it("copies a verified public image to its final key and removes the staged object", async () => {
    stagedObject({ ContentLength: 2048, ContentType: "image/png" }, PNG);

    const result = await finalizeUpload("blog-image", stagedKey("blog-image"), OWNER, "post1");

    expect(result.mime).toBe("image/png");
    expect(result.size).toBe(2048);
    expect(result.location).toMatch(/^https:\/\/cdn\.example\.test\/uploads\/blogs\/post1-[a-z0-9-]+\.png$/);
    const [ranged] = sent(GetObjectCommand);
    expect(ranged.input.Range).toBe("bytes=0-31");
    const [copy] = sent(CopyObjectCommand);
    expect(copy.input).toMatchObject({ Bucket: "public-bucket", CopySource: `private-bucket/${stagedKey("blog-image")}`, ContentType: "image/png" });
    expect(`${"https://cdn.example.test"}/${copy.input.Key}`).toBe(result.location);
    expect(sent(DeleteObjectCommand).map((c) => c.input)).toEqual([{ Bucket: "private-bucket", Key: stagedKey("blog-image") }]);
  });

  it("stores private kinds in the private bucket and returns their /api/files path", async () => {
    stagedObject({ ContentLength: PDF.length, ContentType: "application/pdf" }, PDF);

    const result = await finalizeUpload("course-announcement-attachment", stagedKey("course-announcement-attachment"), OWNER, "course1-1");

    expect(result.location).toMatch(/^\/api\/files\/private\/announcements\/course1-1-[a-z0-9-]+\.pdf$/);
    expect(sent(CopyObjectCommand)[0].input.Bucket).toBe("private-bucket");
  });

  it("rejects and deletes a file whose bytes are not the declared type", async () => {
    stagedObject({ ContentLength: 100, ContentType: "image/png" }, Buffer.from("<html><script>alert(1)</script></html>"));

    await expect(finalizeUpload("blog-image", stagedKey("blog-image"), OWNER, "post1")).rejects.toThrow(/content does not match its type/);
    expect(sent(CopyObjectCommand)).toHaveLength(0);
    expect(sent(DeleteObjectCommand)).toHaveLength(1);
  });

  it("rejects and deletes a type the kind does not allow, even when the bytes match", async () => {
    stagedObject({ ContentLength: PDF.length, ContentType: "application/pdf" }, PDF);

    await expect(finalizeUpload("book-cover", stagedKey("book-cover"), OWNER, "book1")).rejects.toBeInstanceOf(UploadError);
    expect(sent(CopyObjectCommand)).toHaveLength(0);
    expect(sent(DeleteObjectCommand)).toHaveLength(1);
  });

  it("rejects and deletes an oversize object without reading it", async () => {
    stagedObject({ ContentLength: 2 * 1024 * 1024 + 1, ContentType: "image/png" }, PNG);

    await expect(finalizeUpload("library-cover", stagedKey("library-cover"), OWNER, "item1")).rejects.toThrow(/2 MB or smaller/);
    expect(sent(GetObjectCommand)).toHaveLength(0);
    expect(sent(CopyObjectCommand)).toHaveLength(0);
    expect(sent(DeleteObjectCommand)).toHaveLength(1);
  });

  it("refuses another user's key without touching the bucket", async () => {
    await expect(finalizeUpload("blog-image", stagedKey("blog-image", "victim"), OWNER, "post1")).rejects.toBeInstanceOf(UploadError);
    expect(send).not.toHaveBeenCalled();
  });

  it("reports a missing object as an upload error", async () => {
    send.mockRejectedValue(Object.assign(new Error("not found"), { name: "NotFound" }));
    await expect(finalizeUpload("blog-image", stagedKey("blog-image"), OWNER, "post1")).rejects.toThrow(/could not be found/);
  });
});
