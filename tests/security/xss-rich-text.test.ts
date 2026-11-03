import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { sanitizeRichText } from "@/services/rich-text";
import { serializeJsonLd } from "@/components/site/JsonLd";
import { parseBlogForm, parseTeacherBlogForm } from "@/services/blog-mutations";
import { answerFatwaQuestion } from "@/app/admin/fatwa/actions";
import { createUser, resetDb, runAction, sessionFor, SKIP_WITHOUT_DB } from "../helpers/db";
import { LIVE_MARKUP_PATTERNS, XSS_PAYLOADS } from "../helpers/xss";

describe("rich text sanitiser against the XSS corpus", () => {
  it.each(XSS_PAYLOADS)("neutralises %s", (payload) => {
    const out = sanitizeRichText(`<p>before</p>${payload}<p>after</p>`);

    for (const pattern of LIVE_MARKUP_PATTERNS) expect(out, `${pattern} in ${out}`).not.toMatch(pattern);
    expect(out).toContain("<p>before</p>");
  });

  it("still allows the editor's formatting", () => {
    const html = `<h2>Title</h2><p dir="rtl"><strong>Bold</strong> <em>it</em> <u>u</u></p><ul><li>one</li></ul><blockquote>q</blockquote>`;
    expect(sanitizeRichText(html)).toBe(html);
  });

  it("stays safe when applied again, as on write and then again on read", () => {
    for (const payload of XSS_PAYLOADS) {
      const twice = sanitizeRichText(sanitizeRichText(`<p>${payload}</p>`));
      for (const pattern of LIVE_MARKUP_PATTERNS) expect(twice).not.toMatch(pattern);
    }
    const clean = `<p>Plain <strong>formatted</strong> text</p>`;
    expect(sanitizeRichText(sanitizeRichText(clean))).toBe(clean);
  });
});

describe("blog forms sanitise the body before validation", () => {
  const form = (body: string) => {
    const data = new FormData();
    data.set("title", "A perfectly fine title");
    data.set("excerpt", "");
    data.set("body", body);
    return data;
  };

  it.each(XSS_PAYLOADS)("admin blog form strips %s", (payload) => {
    const parsed = parseBlogForm(form(`<p>Some honest introductory text.</p>${payload}`));

    expect(parsed.success).toBe(true);
    for (const pattern of LIVE_MARKUP_PATTERNS) expect(parsed.data?.body).not.toMatch(pattern);
  });

  it("teacher blog form strips payloads too", () => {
    const parsed = parseTeacherBlogForm(form(`<p>Some honest introductory text.</p><script>alert(1)</script>`));
    expect(parsed.data?.body).toBe("<p>Some honest introductory text.</p>");
  });
});

describe("JSON-LD", () => {
  it.each(XSS_PAYLOADS)("cannot leave the script element with %s", (payload) => {
    const out = serializeJsonLd({ "@type": "BlogPosting", headline: payload, nested: [{ description: payload }] });

    expect(out).not.toMatch(/[<>&]/);
    expect(out).not.toMatch(/<\/script/i);
    expect(JSON.parse(out).headline).toBe(payload);
  });
});

describe("every raw-HTML sink goes through a sanitiser", () => {
  const root = path.resolve(__dirname, "../..");

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      if (name === "node_modules" || name === ".next") return [];
      if (statSync(full).isDirectory()) return sourceFiles(full);
      return /\.(tsx?|jsx?)$/.test(name) ? [full] : [];
    });
  }

  it("wraps every dangerouslySetInnerHTML value in sanitizeRichText or serializeJsonLd", () => {
    const offenders: string[] = [];
    for (const dir of ["app", "components"]) {
      for (const file of sourceFiles(path.join(root, dir))) {
        const source = readFileSync(file, "utf8");
        for (const match of source.matchAll(/dangerouslySetInnerHTML=\{\{\s*__html:\s*([^}]+)\}\}/g)) {
          if (!/^(sanitizeRichText|serializeJsonLd)\(/.test(match[1].trim())) {
            offenders.push(`${path.relative(root, file)}: ${match[1].trim()}`);
          }
        }
        for (const match of source.matchAll(/\.innerHTML\s*=(?!=)\s*([^;\n]+)/g)) {
          // Assigning an already sanitised value (`safeValue`) is fine.
          if (!/^(safe\w*|sanitizeRichText\()/.test(match[1].trim()) || !source.includes("sanitizeRichText")) {
            offenders.push(`${path.relative(root, file)}: innerHTML = ${match[1].trim()}`);
          }
        }
        if (/insertAdjacentHTML/.test(source)) offenders.push(`${path.relative(root, file)}: insertAdjacentHTML`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe.skipIf(SKIP_WITHOUT_DB)("stored fatwa answers", () => {
  beforeEach(async () => {
    await resetDb();
    const admin = await createUser({ email: "admin@example.test" });
    vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);
  });

  it.each(XSS_PAYLOADS.slice(0, 12))("stores the admin's answer without %s", async (payload) => {
    const fatwa = await prisma.fatwaQuestion.create({
      data: { askerName: "Anonymous", askerEmail: "anon@example.test", category: "Prayer", title: "A question title", question: "x".repeat(40), approvalStatus: "PENDING" },
    });
    const form = new FormData();
    form.set("answer", `<p>This is a long enough honest answer.</p>${payload}`);

    await runAction(() => answerFatwaQuestion(fatwa.id, form));

    const stored = await prisma.fatwaQuestion.findUniqueOrThrow({ where: { id: fatwa.id } });
    expect(stored.answer).toContain("This is a long enough honest answer.");
    for (const pattern of LIVE_MARKUP_PATTERNS) expect(stored.answer).not.toMatch(pattern);
  });
});
