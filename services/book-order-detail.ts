import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";

/**
 * A single book order with everything the admin detail page shows: customer,
 * line items, payment proof and the audit entries recorded for it.
 */
export async function getBookOrderDetail(id: string) {
  return withDbErrorHandling(async () => {
    const order = await prisma.bookOrder.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: { book: { select: { id: true, title: true, author: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!order) return null;

    const timeline = await prisma.auditLog.findMany({
      where: { entity: "BookOrder", entityId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        action: true,
        actorEmail: true,
        reason: true,
        createdAt: true,
      },
    });

    return { order, timeline };
  }, "Failed to fetch book order");
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  approve: "Approved",
  decline: "Declined",
  ship: "Marked as shipped",
  refund: "Marked as refunded",
  void: "Voided",
  delete: "Deleted",
  soft_delete: "Deleted",
  restore: "Restored",
  update: "Updated",
  create: "Created",
};

/** The words the order timeline shows for an audit-log action. */
export function bookOrderAuditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}
