import { NextRequest } from "next/server";
import { createShippingSlab } from "@/app/admin/shipping-charges/actions";
import { ADMIN_ROLES, readActionForm, staffAction, staffRead } from "@/services/api-staff";
import { getShippingSlabs } from "@/services/book-orders";

/** Shipping charge slabs by order weight, lightest first, as on /admin/shipping-charges. */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/shipping-charges", async () => {
    const slabs = await getShippingSlabs();
    return {
      slabs: slabs.map((s) => ({ id: s.id, minWeightGrams: s.minWeightGrams, maxWeightGrams: s.maxWeightGrams, chargeInrPaise: s.chargeInrPaise })),
    };
  });
}

/** Adds a slab. Fields: minWeightGrams, maxWeightGrams, chargeInr (rupees). The set must stay contiguous from 0 g. */
export async function POST(request: NextRequest) {
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/shipping-charges POST", async () =>
    createShippingSlab(await readActionForm(request)),
  );
}
