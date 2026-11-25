import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { notFound, redirect } from "next/navigation";
import { describe, expect, it } from "vitest";
import { withDbErrorHandling } from "@/utils/db-error";
import { isNextRedirect, nextControlFlowOf } from "@/utils/next-control-flow";

function thrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("expected a throw");
}

describe("utils/next-control-flow", () => {
  it("reads the URL of a redirect()", () => {
    const error = thrown(() => redirect("/admin/payments?err=declined"));
    expect(nextControlFlowOf(error)).toEqual({ kind: "redirect", url: "/admin/payments?err=declined" });
    expect(isNextRedirect(error)).toBe(true);
  });

  it("reads the status of a notFound()", () => {
    const error = thrown(() => notFound());
    expect(nextControlFlowOf(error)).toEqual({ kind: "http-status", status: 404 });
    expect(isNextRedirect(error)).toBe(false);
  });

  it("leaves ordinary errors alone", () => {
    expect(nextControlFlowOf(new Error("boom"))).toBeNull();
    expect(nextControlFlowOf("boom")).toBeNull();
  });
});

describe("unstable_rethrow in the shared error wrappers", () => {
  it("withDbErrorHandling passes redirect() and notFound() through untouched", async () => {
    const redirectError = thrown(() => redirect("/login"));
    await expect(withDbErrorHandling(() => Promise.reject(redirectError), "x")).rejects.toBe(redirectError);
    const notFoundError = thrown(() => notFound());
    await expect(withDbErrorHandling(() => Promise.reject(notFoundError), "x")).rejects.toBe(notFoundError);
  });
});

describe("Next.js internals", () => {
  it("are imported only by utils/next-control-flow.ts", () => {
    const root = path.resolve(__dirname, "../..");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(name) && readFileSync(full, "utf8").includes('from "next/dist/')) {
          offenders.push(path.relative(root, full));
        }
      }
    };
    for (const dir of ["app", "components", "services", "utils", "config", "lib"]) {
      try {
        walk(path.join(root, dir));
      } catch {
        // a directory that does not exist
      }
    }
    expect(offenders).toEqual(["utils/next-control-flow.ts"]);
  });
});
