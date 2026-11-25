import fs from "node:fs";
import path from "node:path";
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

describe("next/image remote hosts in the config", () => {
  it("never falls back to a placeholder host", () => {
    expect(JSON.stringify(nextConfig.images?.remotePatterns ?? [])).not.toContain("your-academy");
  });
});

describe("modules loaded by next.config.ts", () => {
  // Next transpiles next.config.ts on its own, without the tsconfig "@/"
  // paths: an alias anywhere in its import graph fails the build
  // ("Cannot find module"), which the type-check and these tests do not see.
  it("import each other by relative paths only", () => {
    const root = path.resolve(__dirname, "../..");
    const seen = new Set<string>();
    const aliased: string[] = [];
    const visit = (file: string) => {
      if (seen.has(file)) return;
      seen.add(file);
      const source = fs.readFileSync(file, "utf8");
      for (const [, specifier] of source.matchAll(/^\s*import\s[^"']*["']([^"']+)["']/gm)) {
        if (specifier.startsWith("@/")) aliased.push(`${path.relative(root, file)}: ${specifier}`);
        if (!specifier.startsWith(".")) continue;
        const base = path.resolve(path.dirname(file), specifier);
        const target = [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")].find((candidate) => fs.existsSync(candidate));
        if (target) visit(target);
      }
    };
    visit(path.join(root, "next.config.ts"));
    expect(seen.size).toBeGreaterThan(3);
    expect(aliased).toEqual([]);
  });
});
