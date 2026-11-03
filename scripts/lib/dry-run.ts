import fs from "node:fs";
import path from "node:path";

/**
 * Shared conventions for data-correction scripts:
 *  - dry-run by default; nothing is written unless `--apply` is passed
 *  - every row that will be changed is snapshotted to scripts/out/<name>-<ts>.json
 *    before the write, so the change can be reversed by hand
 */
export function isApplyMode(argv: string[] = process.argv): boolean {
  return argv.includes("--apply");
}

export function writeSnapshot(name: string, rows: unknown[]): string {
  const dir = path.join(process.cwd(), "scripts", "out");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `${name}-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(rows, null, 2));
  return file;
}

export function printMode(name: string, apply: boolean) {
  console.log(`== ${name} — ${apply ? "APPLY mode: rows will be written" : "DRY RUN: no rows will be written (pass --apply to write)"}`);
}
