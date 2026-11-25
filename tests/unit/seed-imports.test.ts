import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

// utils/prisma.ts is `server-only`: anything outside Next.js that reaches it
// (the seeds run with tsx) throws at import. The seeds create their own
// client, so their modules must load in plain Node.
describe("seed modules outside Next.js", () => {
  it("load without reaching the server-only Prisma singleton", () => {
    const modules = [
      "./prisma/seed-bootstrap.ts",
      "./prisma/seed-demo-data.ts",
      "./prisma/seed-demo-content.ts",
      "./prisma/seed-demo-bulk.ts",
      "./prisma/seed-demo-notifications.ts",
    ];
    const script = `Promise.all(${JSON.stringify(modules)}.map((m) => import(m))).then(() => console.log("ok"))`;
    const out = execFileSync(path.join(root, "node_modules/.bin/tsx"), ["-e", script], { cwd: root, encoding: "utf8" });
    expect(out.trim()).toBe("ok");
  }, 30_000);
});
