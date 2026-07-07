import Link from "next/link";
import { notFound } from "next/navigation";
import { getDailyInspirationForAdmin, dailyInspirationKindLabel } from "@/services/daily-inspiration";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { deleteDailyInspiration } from "@/app/admin/daily-inspiration/actions";
import { indoPakArabic } from "@/utils/fonts/indo-pak-arabic";
import { Source_Serif_4 } from "next/font/google";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600"] });

export default async function ViewDailyInspirationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getDailyInspirationForAdmin(id);

  if (!item) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/daily-inspiration"
        className="text-sm text-primary hover:underline"
      >
        ← Back to verse &amp; hadith
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">
            View {dailyInspirationKindLabel(item.kind)}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Status: {item.published ? "Published" : "Draft"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/daily-inspiration/${item.id}/edit`}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-border bg-surface px-5 py-2 text-sm font-semibold text-foreground hover:bg-accent-muted/50"
          >
            Edit
          </Link>
          <DeleteActionButton
            action={deleteDailyInspiration.bind(null, item.id)}
            itemName={dailyInspirationKindLabel(item.kind)}
          />
        </div>
      </div>

      <div className="card-elevated p-6 sm:p-8 space-y-6 bg-surface border border-border rounded-xl">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Kind</h3>
          <p className="text-sm font-semibold text-foreground">
            {dailyInspirationKindLabel(item.kind)}
          </p>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Arabic Text</h3>
          <p
            className={`${indoPakArabic.className} indo-pak-arabic text-2xl leading-relaxed text-foreground bg-background p-4 rounded-lg border border-border`}
            dir="rtl"
            lang="ar"
          >
            {item.arabicText}
          </p>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">English Translation</h3>
          <p className={`${sourceSerif.className} text-base sm:text-lg italic text-foreground bg-background p-4 rounded-lg border border-border`}>
            &ldquo;{item.englishTranslation}&rdquo;
          </p>
        </div>

        {item.reference && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Reference</h3>
            <p className="text-sm text-foreground font-medium">
              {item.reference}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
