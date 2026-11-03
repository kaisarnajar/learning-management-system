import { describe, expect, it, vi } from "vitest";
import { isSafeInternalPath, safeInternalPath, getPostLoginPath, authContinueUrl } from "@/services/auth-redirect";
import { escapeHtml, escapeHtmlMultiline } from "@/utils/html-escape";
import { sanitizeRichText, isAllowedLinkUrl } from "@/services/rich-text";
import { serializeJsonLd } from "@/components/site/JsonLd";
import { flashQuery, isFlashCode, readFlash, withFlash, FLASH_MESSAGES } from "@/utils/flash";
import { createWithUniqueSlug, slugify, uniqueSlug } from "@/utils/slug";
import { DbError } from "@/utils/db-error";
import { parseApiPagination } from "@/utils/api-pagination";
import { PAGINATION } from "@/config/constants/business";
import { sniffMime, validateUpload, IMAGE_MIMES, ATTACHMENT_MIMES } from "@/services/storage";

describe("isSafeInternalPath", () => {
  it("accepts same-origin absolute paths", () => {
    for (const path of ["/", "/profile", "/admin/courses?id=1", "/a/b#frag"]) {
      expect(isSafeInternalPath(path)).toBe(true);
    }
  });

  it("rejects external, protocol-relative and backslash variants", () => {
    const bad = [
      "//evil.com",
      "/\\evil.com",
      "https://evil.com",
      "http://localhost/admin",
      "javascript:alert(1)",
      "evil.com",
      "",
      "/path\r\nSet-Cookie: a=b",
      "/path\0",
      "///evil.com",
    ];
    for (const path of bad) expect(isSafeInternalPath(path)).toBe(false);
    expect(isSafeInternalPath(null)).toBe(false);
    expect(isSafeInternalPath(undefined)).toBe(false);
  });

  it("falls back to the default for unsafe values", () => {
    expect(safeInternalPath("//evil.com")).toBe("/");
    expect(safeInternalPath("//evil.com", "/home")).toBe("/home");
    expect(safeInternalPath("/ok")).toBe("/ok");
  });

  it("routes users to their portal after sign-in", () => {
    expect(getPostLoginPath("ADMIN", "/")).toBe("/admin");
    expect(getPostLoginPath("ADMIN", "/admin/finance")).toBe("/admin/finance");
    expect(getPostLoginPath("TEACHER", "/profile")).toBe("/teacher");
    expect(getPostLoginPath("TEACHER", "/teacher/courses")).toBe("/teacher/courses");
    expect(getPostLoginPath("DEVELOPER", "/profile")).toBe("/admin");
    expect(getPostLoginPath("STUDENT", "/courses")).toBe("/courses");
    expect(getPostLoginPath("STUDENT", "//evil.com")).toBe("/");
  });

  it("encodes the continue URL", () => {
    expect(authContinueUrl("/a?b=1")).toBe("/auth/continue?callbackUrl=%2Fa%3Fb%3D1");
    expect(authContinueUrl("//evil.com")).toBe("/auth/continue?callbackUrl=%2F");
  });
});

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("neutralises a script payload", () => {
    const out = escapeHtml(`<img src=x onerror="alert('x')">`);
    expect(out).not.toContain("<");
    expect(out).not.toContain(`"`);
  });

  it("stringifies null, undefined and numbers", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(0)).toBe("0");
    expect(escapeHtml(false)).toBe("false");
  });

  it("does not double-escape in a single pass but does escape ampersands first", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("converts line breaks after escaping", () => {
    expect(escapeHtmlMultiline("a<b\r\nc\nd")).toBe("a&lt;b<br />c<br />d");
  });
});

describe("sanitizeRichText", () => {
  it("returns an empty string for empty input", () => {
    expect(sanitizeRichText(null)).toBe("");
    expect(sanitizeRichText(undefined)).toBe("");
    expect(sanitizeRichText("")).toBe("");
  });

  it("keeps the allow-listed formatting tags", () => {
    const html = "<p>Hello <strong>bold</strong> <em>em</em></p><ul><li>one</li></ul><h2>Title</h2>";
    expect(sanitizeRichText(html)).toBe(html);
  });

  it("strips script, style, iframe, svg and object elements", () => {
    const out = sanitizeRichText(
      `<p>a</p><script>alert(1)</script><style>p{}</style><iframe src="x"></iframe><svg onload="x()"></svg><object data="x"></object>`,
    );
    expect(out).toBe("<p>a</p>");
  });

  it("removes event handlers and javascript: or data: URLs", () => {
    expect(sanitizeRichText(`<p onclick="x()">t</p>`)).toBe("<p>t</p>");
    expect(sanitizeRichText(`<a href="javascript:alert(1)">x</a>`)).not.toContain("javascript:");
    expect(sanitizeRichText(`<a href="data:text/html;base64,AAAA">x</a>`)).not.toContain("data:");
    expect(sanitizeRichText(`<a href="//evil.com">x</a>`)).not.toContain("evil.com");
  });

  it("forces safe rel on links and keeps https and mailto hrefs", () => {
    const out = sanitizeRichText(`<a href="https://example.com" target="_blank" rel="opener">x</a>`);
    expect(out).toContain(`href="https://example.com"`);
    expect(out).toContain(`rel="noopener noreferrer nofollow"`);
    expect(out).toContain(`target="_blank"`);
    expect(sanitizeRichText(`<a href="mailto:a@b.c">m</a>`)).toContain("mailto:a@b.c");
  });

  it("only allows safe inline styles", () => {
    const out = sanitizeRichText(`<span style="color:#ff0000; position:fixed; background:url(x)">t</span>`);
    expect(out).toContain("color:#ff0000");
    expect(out).not.toContain("position");
    expect(out).not.toContain("url(");
    expect(sanitizeRichText(`<p style="text-align:center">t</p>`)).toContain("text-align:center");
  });

  it("validates editor link targets", () => {
    expect(isAllowedLinkUrl("https://a.b")).toBe(true);
    expect(isAllowedLinkUrl(" mailto:a@b.c ")).toBe(true);
    expect(isAllowedLinkUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedLinkUrl("/relative")).toBe(false);
  });
});

describe("serializeJsonLd", () => {
  it("cannot be broken out of a script element", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(out).toContain("\\u003c/script\\u003e");
  });

  it("escapes ampersands and line separators and stays valid JSON", () => {
    const value = { a: "x & y", b: "line\u2028para\u2029" };
    const out = serializeJsonLd(value);
    expect(out).not.toContain("&");
    expect(out).not.toContain("\u2028");
    expect(out).not.toContain("\u2029");
    expect(JSON.parse(out)).toEqual(value);
  });
});

describe("flash messages", () => {
  it("resolves known codes to their copy", () => {
    expect(readFlash({ err: "duplicate" })).toBe(FLASH_MESSAGES.duplicate);
    expect(readFlash({ err: "not_found" })).toBe(FLASH_MESSAGES.not_found);
  });

  it("maps an unknown code to the generic message so raw text never shows", () => {
    expect(readFlash({ err: "PrismaClientKnownRequestError: ..." })).toBe(FLASH_MESSAGES.unexpected);
  });

  it("prefers a trimmed msg over err and returns null when empty", () => {
    expect(readFlash({ msg: "  Pick a course  ", err: "duplicate" })).toBe("Pick a course");
    expect(readFlash({ msg: "   " })).toBeNull();
    expect(readFlash({})).toBeNull();
  });

  it("recognises codes without matching inherited object keys", () => {
    expect(isFlashCode("invalid")).toBe(true);
    expect(isFlashCode("toString")).toBe(false);
    expect(isFlashCode(undefined)).toBe(false);
    expect(readFlash({ err: "toString" })).toBe(FLASH_MESSAGES.unexpected);
  });

  it("appends to a path with or without a query string", () => {
    expect(withFlash("/admin/books", { code: "invalid" })).toBe("/admin/books?err=invalid");
    expect(withFlash("/admin/books?page=2", { code: "invalid" })).toBe("/admin/books?page=2&err=invalid");
    expect(withFlash("/x", { message: "a b&c" })).toBe("/x?msg=a%20b%26c");
    expect(flashQuery({ code: "linked" })).toBe("err=linked");
  });
});

describe("slugs", () => {
  it("slugifies text", () => {
    expect(slugify("  Hello, World!  ")).toBe("hello-world");
    expect(slugify("A_B  C--D")).toBe("a-b-c-d");
    expect(slugify("!!!")).toBe("");
  });

  it("picks the first free suffix", async () => {
    const taken = new Set(["title", "title-1"]);
    await expect(uniqueSlug("Title", async (s) => taken.has(s))).resolves.toBe("title-2");
    await expect(uniqueSlug("???", async () => false)).resolves.toBe("item");
  });

  it("retries create with the next candidate on a unique violation", async () => {
    const taken = new Set<string>();
    let calls = 0;
    const create = vi.fn(async (slug: string) => {
      calls += 1;
      if (calls === 1) {
        // a concurrent writer takes the slug between the check and the insert
        taken.add(slug);
        throw new DbError("UNIQUE", "dup");
      }
      return slug;
    });
    const slug = await createWithUniqueSlug("My Post", async (s) => taken.has(s), create);
    expect(create).toHaveBeenCalledTimes(2);
    expect(slug).toBe("my-post-2");
  });

  it("gives up after the attempt limit and does not retry other errors", async () => {
    const always = vi.fn(async () => {
      throw new DbError("UNIQUE", "dup");
    });
    await expect(createWithUniqueSlug("x", async () => false, always, 2)).rejects.toBeInstanceOf(DbError);
    expect(always).toHaveBeenCalledTimes(2);

    const boom = vi.fn(async () => {
      throw new Error("boom");
    });
    await expect(createWithUniqueSlug("x", async () => false, boom)).rejects.toThrow("boom");
    expect(boom).toHaveBeenCalledTimes(1);
  });
});

describe("parseApiPagination", () => {
  const parse = (query: string) => parseApiPagination(new URLSearchParams(query));

  it("defaults to page 1 and 20 items", () => {
    expect(parse("")).toEqual({ page: 1, pageSize: 20 });
  });

  it("clamps page to >= 1 and pageSize to 1..max", () => {
    expect(parse("page=0&pageSize=0")).toEqual({ page: 1, pageSize: 1 });
    expect(parse("page=-5&pageSize=-1")).toEqual({ page: 1, pageSize: 1 });
    expect(parse("page=3&pageSize=100000")).toEqual({ page: 3, pageSize: PAGINATION.MAX_PAGE_SIZE });
  });

  it("falls back for non-numeric values and honours a custom default", () => {
    expect(parse("page=abc&pageSize=xyz")).toEqual({ page: 1, pageSize: 20 });
    expect(parseApiPagination(new URLSearchParams(""), 10)).toEqual({ page: 1, pageSize: 10 });
  });
});

describe("storage upload checks", () => {
  const bytes = (...head: number[]) => Buffer.from([...head, ...new Array(Math.max(0, 16 - head.length)).fill(0)]);

  it("sniffs the real type from magic bytes", () => {
    expect(sniffMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(sniffMime(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffMime(Buffer.from("GIF89a" + "\0".repeat(10), "ascii"))).toBe("image/gif");
    expect(sniffMime(Buffer.from("RIFF\0\0\0\0WEBPVP8 ", "latin1"))).toBe("image/webp");
    expect(sniffMime(Buffer.from("%PDF-1.7\n%%EOF....", "ascii"))).toBe("application/pdf");
    expect(sniffMime(bytes(0xd0, 0xcf, 0x11, 0xe0))).toBe("application/msword");
    expect(sniffMime(bytes(0x50, 0x4b, 0x03, 0x04))).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
  });

  it("refuses scripts, text and short buffers", () => {
    expect(sniffMime(Buffer.from("<script>alert(1)</script>"))).toBeNull();
    expect(sniffMime(Buffer.from("#!/bin/sh\necho hi\n......"))).toBeNull();
    expect(sniffMime(Buffer.from([0x89, 0x50]))).toBeNull();
  });

  const file = (size: number, type: string) => new File([new Uint8Array(size)], "f", { type });
  const rules = { allowed: IMAGE_MIMES, maxBytes: 1024 * 1024, label: "Image" };

  it("accepts a missing or empty file (field is optional)", () => {
    expect(validateUpload(null, rules)).toEqual({});
    expect(validateUpload(undefined, rules)).toEqual({});
    expect(validateUpload(file(0, "image/png"), rules)).toEqual({});
  });

  it("checks the declared type and the size", () => {
    expect(validateUpload(file(10, "image/png"), rules)).toEqual({});
    expect(validateUpload(file(10, "application/pdf"), rules).error).toBe("Image must be JPEG, PNG, WEBP or GIF.");
    expect(validateUpload(file(1024 * 1024 + 1, "image/png"), rules).error).toBe("Image must be 1 MB or smaller.");
    expect(validateUpload(file(3000, "image/png"), { allowed: ATTACHMENT_MIMES, maxBytes: 2048 }).error).toBe(
      "File must be 2 KB or smaller.",
    );
  });
});
