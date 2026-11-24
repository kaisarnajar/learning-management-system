import { NextRequest } from "next/server";
import { updatePaymentSettings } from "@/app/admin/payment-settings/actions";
import { ADMIN_ROLES, readActionForm, staffAction, staffRead } from "@/services/api-staff";
import { getPaymentSettings } from "@/services/payment-settings";

/** UPI, bank and receipt settings, as on /admin/payment-settings. */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/payment-settings", async () => ({ settings: await getPaymentSettings() }));
}

/**
 * Saves the settings. Fields: upiId, upiNumber, upiPayeeName, bankAccountName,
 * bankName, bankAccountNumber, bankIfsc, bankBranch, and the checkboxes
 * includeGstByDefault, feeWaiverEnabled, autoApproveFullWaivers ("on" when ticked).
 */
export async function PUT(request: NextRequest) {
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/payment-settings PUT", async () =>
    updatePaymentSettings(await readActionForm(request)),
  );
}
