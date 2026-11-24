import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";
import { FORM_UPLOAD_FALLBACK_MAX_BYTES } from "@/config/constants/direct-upload";

describe("the Server Action body limit", () => {
  it("fits the fallback form upload but stays within Vercel's 4.5 MB request cap", () => {
    const limit = nextConfig.experimental?.serverActions?.bodySizeLimit;
    expect(typeof limit).toBe("number");
    expect(limit as number).toBeGreaterThan(FORM_UPLOAD_FALLBACK_MAX_BYTES);
    expect(limit as number).toBeLessThanOrEqual(4.5 * 1024 * 1024);
  });
});
