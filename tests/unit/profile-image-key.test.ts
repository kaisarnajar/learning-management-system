import { describe, expect, it, vi } from "vitest";
import { ownedProfileImageKey } from "@/services/storage";

// utils/s3 reads R2_PUBLIC_URL when it is first imported; vi.hoisted runs before the imports.
vi.hoisted(() => {
  process.env.R2_PUBLIC_URL = "https://files.example.org";
});

describe("ownedProfileImageKey", () => {
  const userId = "cmabc123user";

  it("returns the key of the user's own upload, as a URL or a bare key", () => {
    expect(ownedProfileImageKey(userId, `https://files.example.org/uploads/profiles/${userId}-1732400000000-k3j9x.jpg`)).toBe(
      `uploads/profiles/${userId}-1732400000000-k3j9x.jpg`,
    );
    expect(ownedProfileImageKey(userId, `uploads/profiles/${userId}-1-a.webp`)).toBe(`uploads/profiles/${userId}-1-a.webp`);
    expect(ownedProfileImageKey(userId, `/uploads/profiles/${userId}-1-a.png`)).toBe(`uploads/profiles/${userId}-1-a.png`);
  });

  it.each([
    ["another user's upload", "https://files.example.org/uploads/profiles/cmother999-1-a.jpg"],
    ["an id that only starts with the user's", `https://files.example.org/uploads/profiles/${userId}x-1-a.jpg`],
    ["another prefix", `https://files.example.org/uploads/blogs/${userId}-1-a.jpg`],
    ["another host", `https://evil.example.com/uploads/profiles/${userId}-1-a.jpg`],
    ["a lookalike host", `https://files.example.org.evil.com/uploads/profiles/${userId}-1-a.jpg`],
    ["a traversal", `https://files.example.org/uploads/profiles/${userId}-1/../cmother999-1-a.jpg`],
    ["an encoded traversal", `https://files.example.org/uploads/profiles/${userId}-1%2F..%2Fcmother999-1-a.jpg`],
    ["a percent-encoded id", `https://files.example.org/uploads/profiles/%63mabc123user-1-a.jpg`],
    ["a query string", `https://files.example.org/uploads/profiles/${userId}-1-a.jpg?x=1`],
    ["a non-image extension", `https://files.example.org/uploads/profiles/${userId}-1-a.pdf`],
    ["a default avatar", "/assets/male_icon.png"],
    ["a Google photo", "https://lh3.googleusercontent.com/a/photo"],
    ["nothing", null],
  ])("refuses %s", (_label, url) => {
    expect(ownedProfileImageKey(userId, url)).toBeNull();
  });

  it("refuses when there is no user", () => {
    expect(ownedProfileImageKey("", `uploads/profiles/-1-a.jpg`)).toBeNull();
  });
});
