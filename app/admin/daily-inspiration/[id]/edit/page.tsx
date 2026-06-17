import Link from "next/link";
import { notFound } from "next/navigation";
import { updateDailyInspiration } from "@/app/admin/daily-inspiration/actions";
import { DailyInspirationForm } from "@/components/admin/DailyInspirationForm";
import { getDailyInspirationForAdmin } from "@/lib/daily-inspiration";

export default async function EditDailyInspirationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const item = await getDailyInspirationForAdmin(id);

  if (!item) notFound();

  const action = updateDailyInspiration.bind(null, id);

  return (
    <div>
      <Link href="/admin/daily-inspiration" className="text-sm text-primary hover:underline">
        ← Back to verse &amp; hadith
      </Link>
      <h1 className="mt-4 font-serif text-2xl font-bold text-primary">Edit verse or hadith</h1>

      {query.saved === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">Changes saved.</p>
      )}

      <div className="mt-8">
        <DailyInspirationForm
          item={item}
          action={action}
          submitLabel="Save changes"
          error={query.error ? decodeURIComponent(query.error) : undefined}
        />
      </div>
    </div>
  );
}
