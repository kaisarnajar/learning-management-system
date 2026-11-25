import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { publicStorageBaseUrls, publicStorageHosts, stripPublicStorageBase } from "@/config/storage-urls";
import { buildContentSecurityPolicy } from "@/services/security-headers";
import { isAllowedProfileImageUrl } from "@/utils/validations";

const saved = { ...process.env };

/** Moving the bucket from r2.dev to a custom domain without breaking stored URLs. */
describe("public storage base URLs", () => {
  beforeEach(() => {
    process.env.R2_PUBLIC_URL = "https://media.example.org";
    process.env.R2_LEGACY_PUBLIC_URLS = " https://pub-abc.r2.dev/ , https://media.example.org";
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it("lists the current base first, then the legacy ones, without duplicates", () => {
    expect(publicStorageBaseUrls()).toEqual(["https://media.example.org", "https://pub-abc.r2.dev"]);
    expect(publicStorageHosts()).toEqual(["media.example.org", "pub-abc.r2.dev"]);
  });

  it("finds the key of a URL on either base, and leaves foreign URLs as they are", () => {
    expect(stripPublicStorageBase("https://pub-abc.r2.dev/uploads/books/b1.png")).toBe("uploads/books/b1.png");
    expect(stripPublicStorageBase("https://media.example.org/uploads/books/b1.webp")).toBe("uploads/books/b1.webp");
    expect(stripPublicStorageBase("https://evil.example/uploads/books/b1.png")).toBe("https://evil.example/uploads/books/b1.png");
  });

  it("allows both hosts for images in the CSP and for profile photos", () => {
    const csp = buildContentSecurityPolicy("n0nce");
    expect(csp).toContain("https://media.example.org");
    expect(csp).toContain("https://pub-abc.r2.dev");
    expect(isAllowedProfileImageUrl("https://pub-abc.r2.dev/uploads/profiles/u1-1.png")).toBe(true);
    expect(isAllowedProfileImageUrl("https://evil.example/uploads/profiles/u1-1.png")).toBe(false);
  });
});
