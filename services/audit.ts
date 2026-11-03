import type { Prisma } from "@prisma/client";
import type { Session } from "next-auth";
import { prisma } from "@/utils/prisma";
import { clampPage, paginationArgs, type PaginatedResult } from "@/utils/pagination";
import { withDbErrorHandling } from "@/utils/db-error";

/**
 * Append-only audit trail for admin mutations. Call `recordAudit` with the
 * transaction client of the change so the entry is committed (or rolled
 * back) together with it.
 */
export type AuditAction =
  | "void"
  | "delete"
  | "soft_delete"
  | "restore"
  | "approve"
  | "decline"
  | "reject"
  | "refund"
  | "ship"
  | "generate"
  | "update"
  | "create";

export type AuditEntry = {
  action: AuditAction;
  entity: string;
  entityId: string;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
};

type AuditClient = Pick<Prisma.TransactionClient, "auditLog">;

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  // Strip Dates/BigInts/undefined so the value is valid JSON.
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function recordAudit(
  client: AuditClient,
  session: Session | null,
  entry: AuditEntry,
): Promise<void> {
  await client.auditLog.create({
    data: {
      actorId: session?.user?.id ?? null,
      actorEmail: session?.user?.email ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      reason: entry.reason?.trim() || null,
      before: toJson(entry.before),
      after: toJson(entry.after),
    },
  });
}

export type AuditLogFilters = {
  entity?: string;
  entityId?: string;
  actorEmail?: string;
};

export async function getAuditLogPaginated(
  page: number,
  pageSize: number,
  filters: AuditLogFilters = {},
): Promise<PaginatedResult<Prisma.AuditLogGetPayload<object>>> {
  const where: Prisma.AuditLogWhereInput = {
    ...(filters.entity ? { entity: filters.entity } : {}),
    ...(filters.entityId ? { entityId: filters.entityId } : {}),
    ...(filters.actorEmail ? { actorEmail: { contains: filters.actorEmail, mode: "insensitive" } } : {}),
  };
  const totalCount = await withDbErrorHandling(() => prisma.auditLog.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    ...paginationArgs(safePage, pageSize),
  }), "Database operation failed");
  return { items, totalCount };
}

export async function getAuditEntities(): Promise<string[]> {
  const rows = await withDbErrorHandling(() => prisma.auditLog.findMany({
    distinct: ["entity"],
    select: { entity: true },
    orderBy: { entity: "asc" },
  }), "Database operation failed");
  return rows.map((r) => r.entity);
}
