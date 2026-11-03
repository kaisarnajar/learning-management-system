import Link from "next/link";
import { LibraryForm } from "@/components/admin/LibraryForm";
import { createLibraryItem } from "@/app/admin/library/actions";
import { getFeaturedHomepageLibraryCount } from "@/services/library";
import { requireAdmin } from "@/services/auth-actions";
import { readFlash, type FlashParams } from "@/utils/flash";

export default async function NewLibraryPage({
  searchParams,
}: {
  searchParams: Promise<FlashParams>;
}) {
  await requireAdmin();
  const [featuredCount, params] = await Promise.all([
    getFeaturedHomepageLibraryCount(),
    searchParams,
  ]);

  return (
    <div>
      <Link href="/admin/library" className="text-sm text-primary hover:underline">
        ← Back to library
      </Link>
      <h1 className="mt-4 font-serif text-2xl font-bold text-primary">Add library item</h1>
      {readFlash(params) && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text">{readFlash(params)}</p>
      )}
      <div className="mt-8">
        <LibraryForm featuredCount={featuredCount} action={createLibraryItem} submitLabel="Create item" />
      </div>
    </div>
  );
}
