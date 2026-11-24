import { describe, expect, it } from "vitest";
import { evaluateAudit } from "@/scripts/check-audit.mjs";

const advisory = (id: string, dependency: string, severity = "high") => ({
  source: 1,
  url: `https://github.com/advisories/${id}`,
  severity,
  dependency,
  title: `${id} title`,
});
const report = (vias: Record<string, unknown[]>) => ({
  vulnerabilities: Object.fromEntries(Object.entries(vias).map(([name, via]) => [name, { severity: "high", via }])),
});
const entry = (id: string, pkg: string, until = "2099-01-01") => ({ id, package: pkg, reason: "reviewed", until });

/** scripts/check-audit.mjs gates CI on production advisories (review M25). */
describe("production audit gate", () => {
  it("blocks a high or critical advisory that is not allow-listed", () => {
    const result = evaluateAudit(report({ nodemailer: [advisory("GHSA-aaaa", "nodemailer")], xlsx: [advisory("GHSA-bbbb", "xlsx", "critical")] }), []);
    expect(result.blocking.map((a: { id: string }) => a.id)).toEqual(["GHSA-aaaa", "GHSA-bbbb"]);
  });

  it("ignores moderate and low advisories and the chained entries that only point at another package", () => {
    const result = evaluateAudit(report({ uuid: [advisory("GHSA-cccc", "uuid", "moderate")], prisma: ["@prisma/config"] }), []);
    expect(result).toEqual({ blocking: [], expired: [], unused: [] });
  });

  it("accepts an allow-listed advisory only on the package it names", () => {
    const allow = [entry("GHSA-aaaa", "effect")];
    expect(evaluateAudit(report({ effect: [advisory("GHSA-aaaa", "effect")] }), allow).blocking).toEqual([]);
    expect(evaluateAudit(report({ other: [advisory("GHSA-aaaa", "other")] }), allow).blocking).toHaveLength(1);
  });

  it("fails on an allow-list entry past its review date, and on one that no longer matches anything", () => {
    const result = evaluateAudit(
      report({ effect: [advisory("GHSA-aaaa", "effect")] }),
      [entry("GHSA-aaaa", "effect", "2026-01-01"), entry("GHSA-gone", "xlsx")],
      "2026-11-24",
    );
    expect(result.expired.map((a: { id: string }) => a.id)).toEqual(["GHSA-aaaa"]);
    expect(result.unused.map((e: { id: string }) => e.id)).toEqual(["GHSA-gone"]);
  });
});
