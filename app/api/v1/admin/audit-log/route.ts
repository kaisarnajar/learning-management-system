import { NextRequest } from "next/server";
import { ADMIN_ROLES, pagedBody, staffListParams, staffRead } from "@/services/api-staff";
import { getAuditEntities, getAuditLogPaginated } from "@/services/audit";

/**
 * The audit log, as on /admin/audit-log (newest first). Filters: `entity` (one of `entities`),
 * `entityId`, `actor` (part of the actor's e-mail).
 */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/audit-log", async () => {
    const { page, pageSize, params } = staffListParams(request);
    const filters = {
      entity: params.get("entity")?.trim() || undefined,
      entityId: params.get("entityId")?.trim() || undefined,
      actorEmail: params.get("actor")?.trim() || undefined,
    };
    const [{ items, totalCount }, entities] = await Promise.all([
      getAuditLogPaginated(page, pageSize, filters),
      getAuditEntities(),
    ]);
    return {
      ...pagedBody(
        items.map((e) => ({
          id: e.id,
          createdAt: e.createdAt,
          actorId: e.actorId,
          actorEmail: e.actorEmail,
          actor: e.actorEmail ?? e.actorId ?? "system",
          action: e.action,
          entity: e.entity,
          entityId: e.entityId,
          reason: e.reason,
          before: e.before,
          after: e.after,
        })),
        totalCount,
        page,
        pageSize,
      ),
      entities,
    };
  });
}
