import { SocialLinksForm } from "@/components/admin/SocialLinksForm";
import { requireAdmin } from "@/lib/auth-actions";
import { getSocialLinksSettings } from "@/lib/social-links";
import { updateSocialLinksSettings } from "./actions";

export default async function AdminSocialLinksPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const settings = await getSocialLinksSettings();

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary">Social links</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Contact email, WhatsApp, Facebook, Instagram, and YouTube shown on the public site (footer
        #contact, About Us, top bar, and floating chat button).
      </p>

      {params.saved === "1" ? (
        <p className="mt-4 rounded-md bg-success-bg px-4 py-3 text-sm text-success-text">
          Social links saved.
        </p>
      ) : null}
      {params.error ? (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-red-900">{params.error}</p>
      ) : null}

      <div className="mt-8">
        <SocialLinksForm settings={settings} action={updateSocialLinksSettings} />
      </div>
    </div>
  );
}
