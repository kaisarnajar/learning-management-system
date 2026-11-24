import { NextRequest } from "next/server";
import { deleteShippingSlab } from "@/app/admin/shipping-charges/actions";
import { ADMIN_ROLES, staffAction } from "@/services/api-staff";

type Params = { params: Promise<{ id: string }> };

/** Deletes a slab (refused when the remaining slabs would leave a gap). */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/shipping-charges/[id] DELETE", () => deleteShippingSlab(id));
}
