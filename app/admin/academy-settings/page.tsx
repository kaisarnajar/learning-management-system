import { AcademySettingsForm } from "@/components/admin/AcademySettingsForm";
import { requireAdmin } from "@/lib/auth-actions";
import { getAcademySettings } from "@/lib/academy-settings";
import { updateAcademySettings } from "./actions";
import { ActionToast } from "@/components/shared/ToastProvider";


export default async function AdminAcademySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const settings = await getAcademySettings();

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary">Academy settings</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Core academy details used on official documents, payment receipts, and invoices.
      </p>

      <ActionToast trigger={params.saved === "1"} paramName="saved" message="Academy settings saved." variant="success" />
      {params.error ? (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text">{params.error}</p>
      ) : null}

      <div className="mt-8">
        <AcademySettingsForm settings={settings} action={updateAcademySettings} />
      </div>
    </div>
  );
}
