import Link from "next/link";
import { createDailyInspiration } from "@/app/admin/daily-inspiration/actions";
import { DailyInspirationForm } from "@/components/admin/DailyInspirationForm";
import { requireAdmin } from "@/services/auth-actions";

export default async function NewDailyInspirationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;

  return (
    <div>
      <Link href="/admin/daily-inspiration" className="text-sm text-primary hover:underline">
        ← Back to verse &amp; hadith
      </Link>
      <h1 className="mt-4 font-serif text-2xl font-bold text-primary">New verse or hadith</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Add Arabic text and an English translation. Publish when ready to show on the homepage.
      </p>
      <div className="mt-8">
        <DailyInspirationForm
          action={createDailyInspiration}
          submitLabel="Create entry"
          error={query.error ? decodeURIComponent(query.error) : undefined}
        />
      </div>
    </div>
  );
}
