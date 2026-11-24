import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");
const run = (target?: string) =>
  spawnSync("bash", [path.join(root, "scripts/check-page-auth.sh"), ...(target ? [target] : [])], { cwd: root, encoding: "utf8" });

/** scripts/check-page-auth.sh needs a guard call, not a mention (review L13). */
describe("page auth check", () => {
  it("rejects pages that only mention the guard in a comment, a string or an unused helper", () => {
    const result = run(path.join(root, "scripts/__fixtures__/page-auth/fail"));

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("Unprotected page: app/admin/comment-only/page.tsx");
    expect(result.stdout).toContain("Unprotected page: app/teacher/unused-helper/page.tsx");
    expect(result.stdout).toContain("Unprotected page: app/profile/string-only/page.tsx");
  });

  it("accepts a guard in the page, in generateMetadata, through a local helper or via a shared teaching page", () => {
    const result = run(path.join(root, "scripts/__fixtures__/page-auth/pass"));

    expect(result.stdout).toBe("All protected pages call an explicit auth check.\n");
    expect(result.status).toBe(0);
  });

  it("passes on the real tree", () => {
    const result = run();

    expect(result.stdout).toBe("All protected pages call an explicit auth check.\n");
    expect(result.status).toBe(0);
  });
});
