import { describe, expect, it } from "vitest";
import { getClientIp } from "@/services/rate-limit";

const ipOf = (headers: Record<string, string>) => getClientIp(new Headers(headers));

/** The IP the rate limiter keys on: the proxy's own header wins over one a client can send. */
describe("getClientIp", () => {
  it("prefers x-vercel-forwarded-for, which only the platform sets", () => {
    expect(ipOf({ "x-vercel-forwarded-for": "203.0.113.7", "x-real-ip": "198.51.100.2", "x-forwarded-for": "1.2.3.4, 203.0.113.7" })).toBe("203.0.113.7");
  });

  it("then x-real-ip", () => {
    expect(ipOf({ "x-real-ip": " 198.51.100.2 ", "x-forwarded-for": "1.2.3.4, 198.51.100.2" })).toBe("198.51.100.2");
  });

  it("then the first x-forwarded-for entry", () => {
    expect(ipOf({ "x-forwarded-for": "192.0.2.10, 10.0.0.1" })).toBe("192.0.2.10");
  });

  it("uses the first entry of a list in the preferred header, and skips empty headers", () => {
    expect(ipOf({ "x-vercel-forwarded-for": "203.0.113.8, 10.0.0.1" })).toBe("203.0.113.8");
    expect(ipOf({ "x-vercel-forwarded-for": " ", "x-real-ip": "", "x-forwarded-for": "192.0.2.11" })).toBe("192.0.2.11");
  });

  it("answers unknown without any header", () => {
    expect(ipOf({})).toBe("unknown");
  });
});
