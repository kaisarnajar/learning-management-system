// Used by scripts/check-page-auth.sh; run from the root being checked.
// argv: <repo> [allowlisted page paths...]
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const [repo, ...allowlist] = process.argv.slice(2);
const ts = createRequire(path.join(repo, "package.json"))("typescript");

const SECTIONS = [
  ["app/admin", /^requireAdmin$/],
  ["app/developer", /^requireDeveloper$/],
  ["app/teacher", /^requireTeacher[A-Za-z]*$/],
  ["app/profile", /^requireUser$|^requireStudent[A-Za-z]*$/],
];
const SHARED_PAGES = /^@\/components\/teaching\/(AttendancePages|GradePages|StudentCardPage)$/;

function pages(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name === "page.tsx")
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort();
}

/** Function-like nodes declared at the top level of the file, by name. */
function topLevelFunctions(source) {
  const byName = new Map();
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) byName.set(statement.name.text, statement);
    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) {
          byName.set(decl.name.text, decl.initializer);
        }
      }
    }
  }
  return byName;
}

function isExported(node) {
  return (ts.getModifiers?.(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

function isDefault(node) {
  return (ts.getModifiers?.(node) ?? []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
}

/** The page component and generateMetadata: the entry points Next calls. */
function entryPoints(source, functions) {
  const entries = [];
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && isExported(statement) && isDefault(statement)) entries.push(statement);
    if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
      const target = statement.expression;
      if (ts.isIdentifier(target) && functions.has(target.text)) entries.push(functions.get(target.text));
      else if (ts.isArrowFunction(target) || ts.isFunctionExpression(target)) entries.push(target);
    }
  }
  const metadata = functions.get("generateMetadata");
  if (metadata) {
    const declared = source.statements.find(
      (s) => (ts.isFunctionDeclaration(s) && s.name?.text === "generateMetadata") ||
        (ts.isVariableStatement(s) && s.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && d.name.text === "generateMetadata")),
    );
    if (declared && isExported(declared)) entries.push(metadata);
  }
  return entries;
}

function sharedPageImports(source) {
  const names = new Set();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !SHARED_PAGES.test(statement.moduleSpecifier.text)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) for (const el of bindings.elements) names.add(el.name.text);
  }
  return names;
}

/** Whether `fn` (or a same-file function it calls) calls a guard or renders a shared page. */
function guards(fn, guard, functions, shared, seen = new Set()) {
  if (seen.has(fn)) return false;
  seen.add(fn);
  let found = false;
  const visit = (node) => {
    if (found) return;
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      if (guard.test(name)) return void (found = true);
      const local = functions.get(name);
      if (local && guards(local, guard, functions, shared, seen)) return void (found = true);
    }
    if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && ts.isIdentifier(node.tagName) && shared.has(node.tagName.text)) {
      return void (found = true);
    }
    ts.forEachChild(node, visit);
  };
  if (fn.body) visit(fn.body);
  return found;
}

let failed = false;
for (const [dir, guard] of SECTIONS) {
  for (const file of pages(dir)) {
    if (allowlist.includes(file)) continue;
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const functions = topLevelFunctions(source);
    const shared = sharedPageImports(source);
    const entries = entryPoints(source, functions);
    if (!entries.some((fn) => guards(fn, guard, functions, shared))) {
      console.log(`Unprotected page: ${file} (expected a call matching ${guard.source} in the page component or generateMetadata)`);
      failed = true;
    }
  }
}
process.exit(failed ? 1 : 0);
