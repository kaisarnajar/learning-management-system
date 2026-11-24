import { describe, expect, it, vi } from "vitest";
import { imageRemotePatterns } from "@/config/image-remote-patterns";

describe("next/image remote hosts", () => {
  it("allows only the public R2 host", () => {
    expect(imageRemotePatterns("https://files.example.org")).toEqual([{ protocol: "https", hostname: "files.example.org" }]);
  });

  it("allows no remote host (and warns) when R2_PUBLIC_URL is unset or invalid, never a placeholder", () => {
    const warn = vi.fn();
    expect(imageRemotePatterns(undefined, warn)).toEqual([]);
    expect(imageRemotePatterns("", warn)).toEqual([]);
    expect(imageRemotePatterns("not a url", warn)).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(3);
  });
});
