/**
 * Static schema ↔ migration drift check (no database required).
 *
 * Compares the SQL Prisma would emit for the whole schema
 * (`prisma migrate diff --from-empty --to-schema-datamodel`) with the union
 * of every migration.sql in prisma/migrations, and reports enum types / enum
 * values / tables / columns / indexes / foreign keys that exist in the schema
 * but are created by no migration (and vice versa).
 *
 * Usage:
 *   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > /tmp/full.sql
 *   npx tsx scripts/migration-drift-static.ts /tmp/full.sql [--emit]
 *
 * With --emit the missing statements are printed as guarded, idempotent SQL
 * suitable for a corrective migration. Exit code 1 when drift is found.
 *
 * The CI job additionally runs the authoritative `prisma migrate diff
 * --from-migrations … --to-schema-datamodel … --exit-code` against a
 * throwaway Postgres; this script is the offline approximation.
 */
import fs from "node:fs";
import path from "node:path";

type Column = { name: string; definition: string };
type Table = { name: string; columns: Map<string, Column>; constraintLines: string[] };
type EnumDef = { name: string; values: string[] };

type SchemaState = {
  enums: Map<string, EnumDef>;
  tables: Map<string, Table>;
  indexes: Map<string, string>; // name -> full statement
  foreignKeys: Map<string, string>; // constraint name -> full statement
};

function emptyState(): SchemaState {
  return { enums: new Map(), tables: new Map(), indexes: new Map(), foreignKeys: new Map() };
}

function stripGuards(sql: string): string {
  return sql
    .replace(/IF NOT EXISTS\s+/gi, "")
    .replace(/IF EXISTS\s+/gi, "")
    .replace(/DO \$\$ BEGIN\s*/gi, "")
    .replace(/EXCEPTION\s+WHEN duplicate_object THEN null;\s*END \$\$;/gi, "")
    .replace(/EXCEPTION WHEN duplicate_object THEN null; END \$\$;/gi, "");
}

function splitStatements(sql: string): string[] {
  return stripGuards(sql)
    .replace(/--[^\n]*/g, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseColumns(body: string): { columns: Map<string, Column>; constraintLines: string[] } {
  const columns = new Map<string, Column>();
  const constraintLines: string[] = [];
  // Split on commas that are not inside parentheses.
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of body) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  for (const part of parts) {
    const m = part.match(/^"([^"]+)"\s+([\s\S]+)$/);
    if (m && !/^CONSTRAINT/i.test(part)) {
      columns.set(m[1], { name: m[1], definition: m[2].replace(/\s+/g, " ").trim() });
    } else {
      constraintLines.push(part.replace(/\s+/g, " ").trim());
    }
  }
  return { columns, constraintLines };
}

function applySql(state: SchemaState, sql: string) {
  for (const stmt of splitStatements(sql)) {
    let m: RegExpMatchArray | null;
    if ((m = stmt.match(/^CREATE TYPE "([^"]+)" AS ENUM \(([\s\S]*)\)$/i))) {
      const values = [...m[2].matchAll(/'([^']*)'/g)].map((x) => x[1]);
      state.enums.set(m[1], { name: m[1], values });
    } else if ((m = stmt.match(/^ALTER TYPE "([^"]+)" ADD VALUE '([^']+)'/i))) {
      state.enums.get(m[1])?.values.push(m[2]);
    } else if ((m = stmt.match(/^DROP TYPE "([^"]+)"/i))) {
      state.enums.delete(m[1]);
    } else if ((m = stmt.match(/^CREATE TABLE "([^"]+)" \(([\s\S]*)\)$/i))) {
      const { columns, constraintLines } = parseColumns(m[2]);
      state.tables.set(m[1], { name: m[1], columns, constraintLines });
    } else if ((m = stmt.match(/^DROP TABLE "([^"]+)"/i))) {
      state.tables.delete(m[1]);
      for (const [name, s] of state.indexes) if (s.includes(`ON "${m[1]}"`)) state.indexes.delete(name);
      for (const [name, s] of state.foreignKeys) if (s.startsWith(`ALTER TABLE "${m[1]}"`)) state.foreignKeys.delete(name);
    } else if ((m = stmt.match(/^ALTER TABLE "([^"]+)" ([\s\S]*)$/i))) {
      const table = state.tables.get(m[1]);
      const ops = m[2];
      const fk = ops.match(/ADD CONSTRAINT "([^"]+)" FOREIGN KEY/i);
      if (fk) {
        state.foreignKeys.set(fk[1], stmt);
        continue;
      }
      if (!table) continue;
      for (const op of ops.split(/,(?=\s*(?:ADD|DROP|ALTER)\s+COLUMN)/i)) {
        const add = op.match(/ADD COLUMN\s+"([^"]+)"\s+([\s\S]*)$/i);
        const drop = op.match(/DROP COLUMN\s+"([^"]+)"/i);
        if (add) table.columns.set(add[1], { name: add[1], definition: add[2].replace(/\s+/g, " ").trim() });
        else if (drop) table.columns.delete(drop[1]);
      }
    } else if ((m = stmt.match(/^CREATE (UNIQUE )?INDEX "([^"]+)" ON/i))) {
      state.indexes.set(m[2], stmt);
    } else if ((m = stmt.match(/^DROP INDEX "([^"]+)"/i))) {
      state.indexes.delete(m[1]);
    }
  }
}

function main() {
  const fullSqlPath = process.argv[2];
  const emit = process.argv.includes("--emit");
  if (!fullSqlPath) {
    console.error("Usage: tsx scripts/migration-drift-static.ts <full-schema.sql> [--emit]");
    process.exit(2);
  }

  const target = emptyState();
  applySql(target, fs.readFileSync(fullSqlPath, "utf8"));

  const applied = emptyState();
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  const folders = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  for (const folder of folders) {
    const file = path.join(migrationsDir, folder, "migration.sql");
    if (fs.existsSync(file)) applySql(applied, fs.readFileSync(file, "utf8"));
  }

  const missing: string[] = [];
  const extra: string[] = [];

  for (const [name, def] of target.enums) {
    const have = applied.enums.get(name);
    if (!have) {
      missing.push(`DO $$ BEGIN\n    CREATE TYPE "${name}" AS ENUM (${def.values.map((v) => `'${v}'`).join(", ")});\nEXCEPTION WHEN duplicate_object THEN null; END $$;`);
      continue;
    }
    for (const value of def.values) {
      if (!have.values.includes(value)) {
        missing.push(`ALTER TYPE "${name}" ADD VALUE IF NOT EXISTS '${value}';`);
      }
    }
  }
  for (const name of applied.enums.keys()) if (!target.enums.has(name)) extra.push(`enum ${name} exists in migrations but not in schema`);

  for (const [name, table] of target.tables) {
    const have = applied.tables.get(name);
    if (!have) {
      const body = [
        ...[...table.columns.values()].map((c) => `    "${c.name}" ${c.definition}`),
        ...table.constraintLines.map((c) => `    ${c}`),
      ].join(",\n");
      missing.push(`CREATE TABLE IF NOT EXISTS "${name}" (\n${body}\n);`);
      continue;
    }
    for (const [colName, col] of table.columns) {
      if (!have.columns.has(colName)) {
        missing.push(`ALTER TABLE "${name}" ADD COLUMN IF NOT EXISTS "${colName}" ${col.definition};`);
      }
    }
    for (const colName of have.columns.keys()) {
      if (!table.columns.has(colName)) extra.push(`column ${name}.${colName} exists in migrations but not in schema`);
    }
  }
  for (const name of applied.tables.keys()) if (!target.tables.has(name)) extra.push(`table ${name} exists in migrations but not in schema`);

  for (const [name, stmt] of target.indexes) {
    if (!applied.indexes.has(name)) {
      missing.push(stmt.replace(/^CREATE (UNIQUE )?INDEX /i, (m0, u) => `CREATE ${u ?? ""}INDEX IF NOT EXISTS `) + ";");
    }
  }
  for (const name of applied.indexes.keys()) if (!target.indexes.has(name)) extra.push(`index ${name} exists in migrations but not in schema`);

  for (const [name, stmt] of target.foreignKeys) {
    if (!applied.foreignKeys.has(name)) {
      missing.push(`DO $$ BEGIN\n    ${stmt};\nEXCEPTION WHEN duplicate_object THEN null; END $$;`);
    }
  }
  for (const name of applied.foreignKeys.keys()) if (!target.foreignKeys.has(name)) extra.push(`foreign key ${name} exists in migrations but not in schema`);

  if (emit) {
    console.log("-- Generated by scripts/migration-drift-static.ts: objects present in schema.prisma but in no migration.");
    console.log("-- Every statement is guarded so this is a no-op on a database already synchronised with db push.\n");
    console.log(missing.join("\n\n"));
    return;
  }

  if (missing.length === 0 && extra.length === 0) {
    console.log("No drift: migrations and schema.prisma describe the same database objects.");
    return;
  }
  if (missing.length) {
    console.log(`In schema but missing from migrations (${missing.length}):`);
    for (const s of missing) {
      const firstLine = s.split("\n").find((line) => line.trim() && !/^DO \$\$ BEGIN$/.test(line.trim())) ?? s;
      console.log("  - " + firstLine.trim());
    }
  }
  if (extra.length) {
    console.log(`In migrations but not in schema (${extra.length}):`);
    for (const s of extra) console.log("  - " + s);
  }
  process.exit(1);
}

main();
