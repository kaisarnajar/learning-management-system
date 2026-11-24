import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { deleteLibraryItemById, updateLibraryItem } from "@/app/admin/library/actions";
import { ADMIN_ROLES, readActionForm, staffAction, staffRead } from "@/services/api-staff";
import { libraryFormOptions, libraryItemBody } from "@/services/api-content";
import { getFeaturedHomepageLibraryCount, getLibraryItemById } from "@/services/library";

type Params = { params: Promise<{ id: string }> };

/** One item as /admin/library/[id] and its edit form show it, with the form's options. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/library/[id]", async () => {
    const [item, featuredCount] = await Promise.all([getLibraryItemById(id), getFeaturedHomepageLibraryCount()]);
    if (!item) notFound();
    return { item: libraryItemBody(item), ...libraryFormOptions(featuredCount) };
  });
}

/** Edit (multipart): the create fields; a new `image` replaces the cover, removeImage=true removes it. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/library/[id] PATCH", async () =>
    updateLibraryItem(id, await readActionForm(request)),
  );
}

/** Deletes the item and its cover. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/library/[id] DELETE", () => deleteLibraryItemById(id));
}
