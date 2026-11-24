import { beforeEach, describe, expect, it, vi } from "vitest";
import { prepareDirectUploads, type DirectUploadField } from "@/utils/direct-upload-client";
import { FORM_UPLOAD_FALLBACK_MAX_BYTES } from "@/config/constants/direct-upload";
import { corsOrigins, directUploadCorsConfiguration } from "@/scripts/lib/r2-cors";

const IMAGES: DirectUploadField[] = [{ field: "images", kind: "blog-image" }];
const file = (name: string, size: number, type = "image/png") => new File([new Uint8Array(size)], name, { type });

function formWith(...files: File[]) {
  const form = new FormData();
  form.set("title", "Hello");
  for (const f of files) form.append("images", f);
  return form;
}

let issued = 0;
/** /api/uploads answers with a ticket; the PUT is answered by `put`. */
function fakeFetch(put: () => Promise<Response>, ticketStatus = 200) {
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url) === "/api/uploads") {
      if (ticketStatus !== 200) return Response.json({ success: false, error: "Each image must be 5 MB or smaller." }, { status: ticketStatus });
      const { contentType } = JSON.parse(String(init?.body));
      issued += 1;
      return Response.json({ success: true, key: `staging/blog-image/u1/key-${issued}`, uploadUrl: `https://r2.example.test/put-${issued}`, headers: { "Content-Type": contentType } });
    }
    return put();
  });
}

beforeEach(() => {
  issued = 0;
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

describe("prepareDirectUploads", () => {
  it("uploads each file straight to R2 and submits the keys instead of the files", async () => {
    const form = formWith(file("a.png", 10), file("b.png", 20));
    const fetchImpl = fakeFetch(async () => new Response(null, { status: 200 }));

    expect(await prepareDirectUploads(form, IMAGES, fetchImpl)).toEqual({ ok: true, mode: "direct" });

    expect(form.getAll("images")).toEqual([]);
    expect(form.getAll("imagesKey")).toEqual(["staging/blog-image/u1/key-1", "staging/blog-image/u1/key-2"]);
    expect(form.getAll("imagesKeyName")).toEqual(["a.png", "b.png"]);
    expect(form.get("title")).toBe("Hello");
    const put = fetchImpl.mock.calls.find(([url]) => String(url) === "https://r2.example.test/put-1");
    expect(put?.[1]).toMatchObject({ method: "PUT", headers: { "Content-Type": "image/png" } });
  });

  it("does nothing when no file was chosen", async () => {
    const form = formWith(new File([], "", { type: "application/octet-stream" }));
    const fetchImpl = fakeFetch(async () => new Response(null));
    expect(await prepareDirectUploads(form, IMAGES, fetchImpl)).toEqual({ ok: true, mode: "none" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("falls back to the form upload when R2 cannot be reached (no CORS rule yet) and the files are small", async () => {
    const files = [file("a.png", 1024), file("b.png", 2048)];
    const form = formWith(...files);
    const fetchImpl = fakeFetch(async () => { throw new TypeError("Failed to fetch"); });

    expect(await prepareDirectUploads(form, IMAGES, fetchImpl)).toEqual({ ok: true, mode: "form" });
    expect(form.getAll("images")).toHaveLength(2);
    expect(form.getAll("imagesKey")).toEqual([]);
  });

  it("falls back when R2 answers an error, too", async () => {
    const form = formWith(file("a.png", 1024));
    expect(await prepareDirectUploads(form, IMAGES, fakeFetch(async () => new Response(null, { status: 403 })))).toEqual({ ok: true, mode: "form" });
  });

  it("shows an error instead of falling back when the files are over the form limit", async () => {
    const form = formWith(file("big.pdf", FORM_UPLOAD_FALLBACK_MAX_BYTES + 1, "application/pdf"));
    const result = await prepareDirectUploads(form, [{ field: "images", kind: "course-announcement-attachment" }], fakeFetch(async () => { throw new TypeError("Failed to fetch"); }));

    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/over 4 MB/) });
  });

  it("shows the server's message for a file it refuses, without falling back", async () => {
    const form = formWith(file("a.png", 10));
    const result = await prepareDirectUploads(form, IMAGES, fakeFetch(async () => new Response(null), 400));

    expect(result).toEqual({ ok: false, error: "Each image must be 5 MB or smaller." });
  });
});

describe("the R2 CORS rule (scripts/configure-r2-cors.ts)", () => {
  it("allows only PUT with Content-Type from the site's origins", () => {
    expect(directUploadCorsConfiguration(["https://academy.example"]).CORSRules).toEqual([
      expect.objectContaining({ AllowedOrigins: ["https://academy.example"], AllowedMethods: ["PUT"], AllowedHeaders: ["content-type"] }),
    ]);
  });

  it("takes origins from --origin, else from AUTH_URL and NEXT_PUBLIC_APP_URL", () => {
    expect(corsOrigins(["--origin=https://a.example/x", "--origin=nonsense"], { AUTH_URL: "https://b.example" })).toEqual(["https://a.example"]);
    expect(corsOrigins([], { AUTH_URL: "https://b.example/", NEXT_PUBLIC_APP_URL: "https://b.example" })).toEqual(["https://b.example"]);
    expect(corsOrigins([], {})).toEqual([]);
  });
});
