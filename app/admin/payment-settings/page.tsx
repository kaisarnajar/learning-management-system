import { PaymentSettingsForm } from "@/components/admin/PaymentSettingsForm";
import { requireAdmin } from "@/lib/auth-actions";
import { getPaymentSettings } from "@/lib/payment-settings";
import { updatePaymentSettings } from "./actions";

export default async function AdminPaymentSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const settings = await getPaymentSettings();

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary">Payment details</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        UPI and bank information shown to students when paying course fees. Configure these before
        students enroll or pay monthly fees.
      </p>

      {params.saved === "1" ? (
        <p className="mt-4 rounded-md bg-success-bg px-4 py-3 text-sm text-success-text">
          Payment details saved.
        </p>
      ) : null}
      {params.error ? (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-red-900">{params.error}</p>
      ) : null}

      <div className="mt-8">
        <PaymentSettingsForm settings={settings} action={updatePaymentSettings} />
      </div>
    </div>
  );
}
