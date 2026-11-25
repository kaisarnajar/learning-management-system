#!/usr/bin/env node
// Fails on any high or critical advisory in production dependencies
// (`npm audit --omit=dev`) that is not in scripts/audit-allowlist.json.
// An allow-list entry covers one advisory on one package, until its review
// date; an expired or unused entry fails too, so the list cannot go stale.
//
// Usage: node scripts/check-audit.mjs [audit.json]   (reads `npm audit` output
// from the file instead of running npm; used by tests)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const BLOCKING = new Set(["high", "critical"]);

/** Returns { blocking: [...], expired: [...], unused: [...] } for an `npm audit --json` report. */
export function evaluateAudit(report, allowlist, today = new Date().toISOString().slice(0, 10)) {
  const found = new Map(); // "<id>|<package>" -> advisory
  for (const [name, vuln] of Object.entries(report.vulnerabilities ?? {})) {
    for (const via of vuln.via ?? []) {
      if (typeof via === "string" || !BLOCKING.has(via.severity)) continue;
      const id = String(via.url ?? via.source).split("/").pop();
      found.set(`${id}|${via.dependency ?? name}`, { id, package: via.dependency ?? name, severity: via.severity, title: via.title });
    }
  }
  const live = new Map(allowlist.map((entry) => [`${entry.id}|${entry.package}`, entry]));
  const blocking = [];
  const expired = [];
  for (const [key, advisory] of found) {
    const entry = live.get(key);
    if (!entry) blocking.push(advisory);
    else if (entry.until < today) expired.push({ ...advisory, until: entry.until });
  }
  const unused = allowlist.filter((entry) => !found.has(`${entry.id}|${entry.package}`));
  return { blocking, expired, unused };
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const file = process.argv[2];
  let raw;
  if (file) raw = readFileSync(file, "utf8");
  else {
    try {
      raw = execFileSync("npm", ["audit", "--omit=dev", "--json"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    } catch (error) {
      raw = error.stdout; // npm audit exits non-zero when it finds anything
    }
  }
  const report = JSON.parse(raw);
  if (report.error) {
    console.error("npm audit failed:", report.error.summary ?? report.error);
    process.exit(2);
  }
  const { advisories } = JSON.parse(readFileSync(path.join(root, "scripts/audit-allowlist.json"), "utf8"));
  const { blocking, expired, unused } = evaluateAudit(report, advisories);

  for (const a of blocking) console.log(`BLOCKING ${a.severity}: ${a.id} in ${a.package}: ${a.title}`);
  for (const a of expired) console.log(`EXPIRED allow-list entry (review was due ${a.until}): ${a.id} in ${a.package}`);
  for (const e of unused) console.log(`UNUSED allow-list entry, remove it: ${e.id} in ${e.package}`);
  if (blocking.length || expired.length || unused.length) process.exit(1);
  console.log(`No unreviewed high or critical production advisories (${advisories.length} allow-listed).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
