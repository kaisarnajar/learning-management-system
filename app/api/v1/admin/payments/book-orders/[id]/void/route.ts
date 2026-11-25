import { NextRequest } from "next/server";
import { ADMIN_ROLES, readActionForm, staffServiceAction } from "@/services/api-staff";
import { revalidateOrderPaths, voidOrder } from "@/services/book-order-transitions";

type Params = { params: Promise<{ id: string }> };

/** Voids a declined or refunded book order (Completed payments → book tabs). Body: `reason`. */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffServiceAction(
    request,
    ADMIN_ROLES,
    "api/v1/admin/payments/book-orders/[id]/void",
    async (ctx) => {
      const form = await readActionForm(request);
      return voidOrder(ctx.session, id, (form.get("reason") as string | null) ?? undefined);
    },
    (result) => {
      revalidateOrderPaths(result.userId);
      return { result: null };
    },
  );
}
