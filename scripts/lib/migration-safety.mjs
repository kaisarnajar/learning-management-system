// Used by scripts/check-migration-safety.sh.
// argv: <migrations dir> <baseline stamp> [exempt "<migration>:<rule>" ...]
//
// Each migration.sql is split into statements (on `;` outside string literals,
// so the statements inside a DO $$ … $$ body are checked one by one, and SQL
// built as a string for EXECUTE is still seen). Comments are removed before
// matching; a `-- safety: allow <reason>` comment inside a statement, or on
// the lines just before it, exempts that one statement.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const IDENT = String.raw`(?:"[^"]+"|[\w%.]+)`;

/** Rules: [name, test(statement, file) => boolean]. Statements are upper-cased, whitespace-collapsed. */
const RULES = [
  ["DROP TABLE", (s) => /\bDROP TABLE\b/.test(s)],
  ["DROP COLUMN", (s) => /\bDROP COLUMN\b/.test(s)],
  ["TRUNCATE", (s) => /\bTRUNCATE\b/.test(s)],
  ["DROP CONSTRAINT", (s) => /\bDROP CONSTRAINT\b/.test(s)],
  ["DROP TYPE", (s) => /\bDROP TYPE\b/.test(s)],
  ["DROP SCHEMA", (s) => /\bDROP SCHEMA\b/.test(s)],
  // Dropping an index is fine when the same migration recreates it under the same name.
  [
    "DROP INDEX",
    (s, file) => {
      const m = s.match(/\bDROP INDEX (?:CONCURRENTLY )?(?:IF EXISTS )?("[^"]+"|[\w.]+)/);
      if (!m) return false;
      if (/\bCONCURRENTLY\b/.test(s)) return true;
      const name = m[1].replace(/^.*\./, "");
      const recreate = new RegExp(String.raw`\bCREATE (?:UNIQUE )?INDEX (?:IF NOT EXISTS )?${escape(name)}(?=[\s(])`);
      return !recreate.test(file);
    },
  ],
  // `ALTER [COLUMN] x [SET DATA] TYPE`, quoted or not ("ALTER TYPE e ADD VALUE" doesn't match).
  ["ALTER COLUMN … TYPE", (s) => new RegExp(String.raw`\bALTER (?:COLUMN )?${IDENT} (?:SET DATA )?TYPE\b`).test(s)],
  ["RENAME", (s) => /\bRENAME\b/.test(s)],
  ["SET NOT NULL", (s) => /\bSET NOT NULL\b/.test(s)],
  ["DELETE without WHERE", (s) => /\bDELETE FROM\b/.test(s) && !hasRealWhere(s)],
  ["UPDATE without WHERE", (s) => new RegExp(String.raw`(?<!\bON )\bUPDATE (?:ONLY )?${IDENT}(?: (?:AS )?${IDENT})? SET\b`).test(s) && !hasRealWhere(s)],
];

function escape(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A WHERE clause that actually filters (not `WHERE true` / `WHERE 1 = 1`). */
function hasRealWhere(s) {
  const m = s.match(/\bWHERE (.*)$/);
  if (!m) return false;
  // Trailing quote/parenthesis/argument list: the statement was built as an EXECUTE string.
  const condition = m[1].replace(/['")]+\s*(?:,.*)?$/, "").trim();
  return !/^(?:TRUE|1 ?= ?1|NOT FALSE)(?: RETURNING\b.*)?$/.test(condition);
}

/**
 * Splits SQL into statements. Returns [{ text, comments, line }] where text has
 * comments removed and comments holds the comment text seen since the previous
 * statement ended.
 */
export function splitStatements(sql) {
  const out = [];
  let text = "";
  let comments = [];
  let line = 1;
  let startLine = 1;
  let inString = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "\n") line++;
    if (inString) {
      text += ch;
      if (ch === "'") {
        if (sql[i + 1] === "'") {
          text += "'";
          i++;
        } else inString = false;
      }
      continue;
    }
    if (ch === "-" && sql[i + 1] === "-") {
      const end = sql.indexOf("\n", i);
      const stop = end === -1 ? sql.length : end;
      comments.push(sql.slice(i + 2, stop).trim());
      i = stop - 1;
      continue;
    }
    if (ch === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2);
      const stop = end === -1 ? sql.length : end + 2;
      const body = sql.slice(i + 2, end === -1 ? sql.length : end);
      comments.push(body.trim());
      line += (body.match(/\n/g) || []).length;
      text += " ";
      i = stop - 1;
      continue;
    }
    if (ch === "'") {
      inString = true;
      text += ch;
      continue;
    }
    if (ch === ";") {
      if (text.trim()) out.push({ text, comments, line: startLine });
      text = "";
      comments = [];
      continue;
    }
    if (!text.trim() && /\S/.test(ch)) startLine = line;
    text += ch;
  }
  if (text.trim()) out.push({ text, comments, line: startLine });
  return out;
}

const ALLOW = /^safety:\s*allow\s+\S/i;

/** Returns [{ rule, line, statement }] for one migration file's SQL. */
export function checkSql(sql) {
  const statements = splitStatements(sql);
  const file = statements.map((s) => normalise(s.text)).join(" ; ");
  const violations = [];
  for (const statement of statements) {
    if (statement.comments.some((c) => ALLOW.test(c))) continue;
    const s = normalise(statement.text);
    for (const [rule, test] of RULES) {
      if (test(s, file)) violations.push({ rule, line: statement.line, statement: statement.text.replace(/\s+/g, " ").trim().slice(0, 160) });
    }
  }
  return violations;
}

function normalise(text) {
  return text.replace(/\s+/g, " ").trim().toUpperCase();
}

function main() {
  const [dir, baseline, ...exempt] = process.argv.slice(2);
  const exemptions = new Set(exempt);
  let failed = false;
  const names = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  for (const name of names) {
    if (name.split("_")[0] < baseline) continue;
    const file = path.join(dir, name, "migration.sql");
    if (!existsSync(file)) continue;
    const violations = checkSql(readFileSync(file, "utf8")).filter((v) => !exemptions.has(`${name}:${v.rule}`));
    for (const v of violations) {
      failed = true;
      console.log(`DESTRUCTIVE (${v.rule}) in ${name}, statement at line ${v.line}: ${v.statement}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
