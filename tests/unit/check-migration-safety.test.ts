import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkSql } from "@/scripts/lib/migration-safety.mjs";

const root = path.resolve(__dirname, "../..");
const fixtures = path.join(root, "scripts/__fixtures__/migrations");
const run = (target?: string) =>
  spawnSync("bash", [path.join(root, "scripts/check-migration-safety.sh"), ...(target ? [target] : [])], { cwd: root, encoding: "utf8" });
const sqlOf = (kind: "fail" | "pass", name: string) => readFileSync(path.join(fixtures, kind, name, "migration.sql"), "utf8");
const rulesOf = (sql: string) => (checkSql(sql) as { rule: string }[]).map((v) => v.rule);

const EXPECTED: Record<string, string> = {
  alter_column_type_quoted: "ALTER COLUMN … TYPE",
  alter_column_type_unquoted: "ALTER COLUMN … TYPE",
  delete_where_true: "DELETE without WHERE",
  delete_without_where: "DELETE without WHERE",
  drop_column: "DROP COLUMN",
  drop_constraint: "DROP CONSTRAINT",
  drop_index: "DROP INDEX",
  drop_schema: "DROP SCHEMA",
  drop_table: "DROP TABLE",
  drop_type: "DROP TYPE",
  dynamic_sql: "DROP CONSTRAINT",
  marker_on_other_statement: "DROP TABLE",
  marker_without_reason: "DROP TABLE",
  rename: "RENAME",
  set_not_null: "SET NOT NULL",
  truncate: "TRUNCATE",
  update_where_true: "UPDATE without WHERE",
  update_without_where: "UPDATE without WHERE",
};

/** scripts/check-migration-safety.sh catches more destructive SQL (review M24). */
describe("migration safety check", () => {
  it("has an expectation for every failing fixture", () => {
    expect(readdirSync(path.join(fixtures, "fail")).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it.each(Object.entries(EXPECTED))("rejects %s", (name, rule) => {
    expect(rulesOf(sqlOf("fail", name))).toEqual([rule]);
  });

  it.each(readdirSync(path.join(fixtures, "pass")))("accepts %s", (name) => {
    expect(rulesOf(sqlOf("pass", name))).toEqual([]);
  });

  it("fails the script on the failing fixtures and passes the passing ones", () => {
    const failing = run(path.join(fixtures, "fail"));
    expect(failing.status).toBe(1);
    for (const name of Object.keys(EXPECTED)) expect(failing.stdout).toContain(` in ${name},`);

    const passing = run(path.join(fixtures, "pass"));
    expect(passing.status).toBe(0);
  });

  it("passes on every real migration", () => {
    const result = run();
    expect(result.stdout).toContain("Migration safety check passed");
    expect(result.status).toBe(0);
  });
});
