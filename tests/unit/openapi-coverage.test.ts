import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * docs/openapi.yaml is the contract the Android app is generated from. Every
 * /api/v1 route handler must be described there, and the spec must not list
 * an operation that no longer exists.
 */
const root = path.resolve(import.meta.dirname, "../..");
const apiRoot = path.join(root, "app/api/v1");
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return name === "route.ts" ? [full] : [];
  });
}

function operationsInCode(): string[] {
  return routeFiles(apiRoot).flatMap((file) => {
    const source = readFileSync(file, "utf8");
    const route = "/" + path.relative(apiRoot, path.dirname(file)).split(path.sep).join("/").replace(/\[([^\]]+)\]/g, "{$1}");
    return METHODS.filter((method) =>
      new RegExp(`export (async )?(function|const) ${method}\\b|export \\{[^}]*\\b${method}\\b[^}]*\\}`).test(source),
    ).map((method) => `${method} ${route}`);
  });
}

function operationsInSpec(): string[] {
  const lines = readFileSync(path.join(root, "docs/openapi.yaml"), "utf8").split("\n");
  const start = lines.indexOf("paths:");
  const operations: string[] = [];
  let current: string | null = null;
  for (const line of lines.slice(start + 1)) {
    const pathMatch = /^ {2}(\/\S*):\s*$/.exec(line);
    if (pathMatch) {
      current = pathMatch[1];
      continue;
    }
    const methodMatch = /^ {4}(get|post|put|patch|delete):\s*$/.exec(line);
    if (methodMatch && current) operations.push(`${methodMatch[1].toUpperCase()} ${current}`);
  }
  return operations;
}

describe("docs/openapi.yaml", () => {
  it("describes exactly the /api/v1 operations the code implements", () => {
    expect(operationsInSpec().sort()).toEqual(operationsInCode().sort());
  });
});
