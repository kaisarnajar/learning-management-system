"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/services/auth-actions";
import { PAYMENT_SETTINGS_ID } from "@/services/payment-settings";
import { prisma } from "@/utils/prisma";
import { paymentSettingsSchema } from "@/utils/validations";
import { withDbErrorHandling } from "@/utils/db-error";

function revalidatePaymentSettingsPaths() {
  const paths = [
    "/admin/payment-settings",
    "/profile/payments",
    "/profile/courses",
  ];
  for (const path of paths) {
    revalidatePath(path, "layout");
    revalidatePath(path, "page");
  }
}

export async function updatePaymentSettings(formData: FormData) {
  await requireAdmin();

  const parsed = paymentSettingsSchema.safeParse({
    upiId: formData.get("upiId"),
    upiNumber: formData.get("upiNumber"),
    upiPayeeName: formData.get("upiPayeeName"),
    bankAccountName: formData.get("bankAccountName"),
    bankName: formData.get("bankName"),
    bankAccountNumber: formData.get("bankAccountNumber"),
    bankIfsc: formData.get("bankIfsc"),
    bankBranch: (formData.get("bankBranch") as string | null) ?? "",
    includeGstByDefault: formData.get("includeGstByDefault") === "on",
    feeWaiverEnabled: formData.get("feeWaiverEnabled") === "on",
  });

  if (!parsed.success) {
    redirect(
      `/admin/payment-settings?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`,
    );
  }

  const data = {
    ...parsed.data,
    bankBranch: parsed.data.bankBranch?.trim() ?? "",
  };

  await withDbErrorHandling(() => prisma.paymentSettings.upsert({
      where: { id: PAYMENT_SETTINGS_ID },
      create: { id: PAYMENT_SETTINGS_ID, ...data },
      update: data,
    }), "Database operation failed");

  revalidatePaymentSettingsPaths();
  redirect("/admin/payment-settings?saved=1");
}
