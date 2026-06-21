import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { LibraryForm } from "@/components/admin/LibraryForm";
import { deleteLibraryItem, updateLibraryItem } from "@/app/admin/library/actions";
import { getFeaturedHomepageLibraryCount, getLibraryItemById } from "@/lib/library";
import { ActionToast } from "@/components/shared/ToastProvider";


export default async function EditLibraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; created?: string; saveError?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const [item, featuredCount] = await Promise.all([
    getLibraryItemById(id),
    getFeaturedHomepageLibraryCount(),
  ]);

  if (!item) notFound();

  const boundUpdate = updateLibraryItem.bind(null, id);
  const boundDelete = deleteLibraryItem.bind(null, id);

  return (
    <div>
      <Link href={`/admin/library/${id}`} className="text-sm text-primary hover:underline">
        ← Back to item
      </Link>
      <h1 className="mt-4 font-serif text-2xl font-bold text-primary">Edit library item</h1>

      <ActionToast trigger={query.saved === "1"} paramName="saved" message="Changes saved." variant="info" />
      <ActionToast trigger={query.created === "1"} paramName="created" message="Item created." variant="info" />
      {query.saveError && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text">{query.saveError}</p>
      )}

      <div className="mt-8">
        <LibraryForm item={item} featuredCount={featuredCount} action={boundUpdate} submitLabel="Save changes" />
      </div>

      <DeleteActionButton action={boundDelete} itemName="item" />
    </div>
  );
}
