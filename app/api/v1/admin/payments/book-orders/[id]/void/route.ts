import { NextRequest } from "next/server";
import { voidBookOrder } from "@/app/admin/bookstore/orders/actions";
import { ADMIN_ROLES, readActionForm, staffAction } from "@/services/api-staff";

type Params = { params: Promise<{ id: string }> };

/** Voids a declined or refunded book order (Completed payments → book tabs). Body: `reason`. */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/payments/book-orders/[id]/void", async () => {
    const form = await readActionForm(request);
    return voidBookOrder(id, (form.get("reason") as string | null) ?? undefined);
  });
}
