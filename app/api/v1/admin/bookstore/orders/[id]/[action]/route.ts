import { NextRequest } from "next/server";
import {
  approveBookOrder,
  declineBookOrder,
  markBookOrderRefunded,
  markBookOrderShipped,
  voidBookOrder,
} from "@/app/admin/bookstore/orders/actions";
import { ADMIN_ROLES, readActionForm, staffAction } from "@/services/api-staff";
import { apiError } from "@/utils/api-response";

type Params = { params: Promise<{ id: string; action: string }> };

const ACTIONS = ["approve", "decline", "ship", "refund", "void"] as const;
type OrderAction = (typeof ACTIONS)[number];

/**
 * A status change from the orders page:
 *  - approve: pending → approved (checks and commits stock, records the payment, e-mails the student);
 *  - decline: pending → declined;
 *  - ship:    approved → shipped, body { courierServiceName, trackingId };
 *  - refund:  approved or shipped → refunded (the recorded payment is voided);
 *  - void:    declined or refunded → removed from the lists (kept for audit), body { reason } (3+ characters).
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { id, action } = await params;
  if (!ACTIONS.includes(action as OrderAction)) return apiError("Unknown order action.", 404);
  return staffAction(request, ADMIN_ROLES, `api/v1/admin/bookstore/orders/[id]/${action}`, async () => {
    switch (action as OrderAction) {
      case "approve":
        return approveBookOrder(id);
      case "decline":
        return declineBookOrder(id);
      case "ship": {
        const form = await readActionForm(request);
        return markBookOrderShipped(id, String(form.get("courierServiceName") ?? ""), String(form.get("trackingId") ?? ""));
      }
      case "refund":
        return markBookOrderRefunded(id);
      case "void": {
        const form = await readActionForm(request);
        return voidBookOrder(id, String(form.get("reason") ?? ""));
      }
    }
  });
}
