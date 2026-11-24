import { NextRequest } from "next/server";
import { ADMIN_ROLES, readActionForm, staffServiceAction } from "@/services/api-staff";
import {
  approveOrder,
  declineOrder,
  refundOrder,
  revalidateOrderPaths,
  shipOrder,
  voidOrder,
  type OrderActionResult,
} from "@/services/book-order-transitions";
import { adminReturnUrl } from "@/utils/admin-redirects";
import { apiError } from "@/utils/api-response";

type Params = { params: Promise<{ id: string; action: string }> };

const ACTIONS = ["approve", "decline", "ship", "refund", "void"] as const;
type OrderAction = (typeof ACTIONS)[number];

/** The `?<event>=1` the orders page shows a toast for; void has none (the website stays on the page). */
const EVENTS: Record<OrderAction, string | null> = {
  approve: "confirmed",
  decline: "declined",
  ship: "shipped",
  refund: "refunded",
  void: null,
};

/**
 * A status change from the orders page:
 *  - approve: pending → approved (checks and commits stock, records the payment, e-mails the student);
 *  - decline: pending → declined;
 *  - ship:    approved → shipped, body { courierServiceName, trackingId };
 *  - refund:  approved or shipped → refunded (the recorded payment is voided); body { booksReturned }
 *             for a shipped order: true puts its books back in stock, otherwise they are written off;
 *  - void:    declined or refunded → removed from the lists (kept for audit), body { reason } (3+ characters).
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { id, action } = await params;
  if (!ACTIONS.includes(action as OrderAction)) return apiError("Unknown order action.", 404);
  const orderAction = action as OrderAction;
  return staffServiceAction(
    request,
    ADMIN_ROLES,
    `api/v1/admin/bookstore/orders/[id]/${action}`,
    async (ctx): Promise<OrderActionResult<{ userId: string; alreadyApproved?: boolean }>> => {
      switch (orderAction) {
        case "approve":
          return approveOrder(id);
        case "decline":
          return declineOrder(id);
        case "ship": {
          const form = await readActionForm(request);
          return shipOrder(id, String(form.get("courierServiceName") ?? ""), String(form.get("trackingId") ?? ""));
        }
        case "refund": {
          const form = await readActionForm(request);
          const returned = String(form.get("booksReturned") ?? "");
          return refundOrder(ctx.session, id, returned === "on" || returned === "true");
        }
        case "void": {
          const form = await readActionForm(request);
          return voidOrder(ctx.session, id, String(form.get("reason") ?? ""));
        }
      }
    },
    (result) => {
      if (!result.alreadyApproved) revalidateOrderPaths(result.userId);
      const event = EVENTS[orderAction];
      return event ? { redirect: adminReturnUrl(undefined, "/admin/bookstore/orders", event) } : { result: null };
    },
  );
}
