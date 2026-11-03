import type { Metadata } from "next";
import { requireAdmin } from "@/services/auth-actions";
import { getAuditEntities, getAuditLogPaginated } from "@/services/audit";
import { Pagination } from "@/components/shared/Pagination";
import { clampPage, parsePaginationParams } from "@/utils/pagination";
import { inputClassName } from "@/utils/form";

export const metadata: Metadata = { title: "Audit log" };

export const dynamic = "force-dynamic";

function formatJson(value: unknown): string {
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value, null, 1).slice(0, 600);
  } catch {
    return String(value);
  }
}

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; entity?: string; entityId?: string; actor?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const { page: requestedPage, pageSize } = parsePaginationParams(params);
  const filters = {
    entity: params.entity?.trim() || undefined,
    entityId: params.entityId?.trim() || undefined,
    actorEmail: params.actor?.trim() || undefined,
  };
  const [{ items, totalCount }, entities] = await Promise.all([
    getAuditLogPaginated(requestedPage, pageSize, filters),
    getAuditEntities(),
  ]);
  const page = clampPage(requestedPage, totalCount, pageSize);

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-foreground">Audit log</h1>
      <p className="mt-1 text-sm text-muted">
        Every void, delete, approval and other admin change, with who did it and what changed.
      </p>

      <form method="get" className="mt-6 grid gap-3 sm:grid-cols-4">
        <select name="entity" defaultValue={filters.entity ?? ""} className={inputClassName} aria-label="Entity">
          <option value="">All entities</option>
          {entities.map((entity) => (
            <option key={entity} value={entity}>{entity}</option>
          ))}
        </select>
        <input name="entityId" defaultValue={filters.entityId ?? ""} placeholder="Entity id" className={inputClassName} aria-label="Entity id" />
        <input name="actor" defaultValue={filters.actorEmail ?? ""} placeholder="Actor e-mail" className={inputClassName} aria-label="Actor e-mail" />
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-light">
          Filter
        </button>
      </form>

      {items.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center text-sm text-muted">
          No audit entries match.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Before → After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((entry) => (
                <tr key={entry.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {entry.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </td>
                  <td className="px-4 py-3">{entry.actorEmail ?? entry.actorId ?? "system"}</td>
                  <td className="px-4 py-3 font-medium">{entry.action}</td>
                  <td className="px-4 py-3">
                    <div>{entry.entity}</div>
                    <div className="font-mono text-xs text-muted">{entry.entityId}</div>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-muted">{entry.reason ?? "—"}</td>
                  <td className="px-4 py-3">
                    <details>
                      <summary className="cursor-pointer text-xs text-primary">Show</summary>
                      <pre className="mt-2 max-w-md whitespace-pre-wrap break-all text-xs text-muted">
{formatJson(entry.before)}
{entry.before !== null && entry.after !== null ? "\n→\n" : ""}
{formatJson(entry.after)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination basePath="/admin/audit-log" params={params} page={page} totalCount={totalCount} pageSize={pageSize} />
    </div>
  );
}
