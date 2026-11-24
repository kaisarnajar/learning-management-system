import { NextRequest } from "next/server";
import { createLibraryItem } from "@/app/admin/library/actions";
import { ADMIN_ROLES, pagedBody, readActionForm, staffAction, staffListParams, staffRead } from "@/services/api-staff";
import { libraryItemBody, libraryFormOptions } from "@/services/api-content";
import { getAllLibraryItemsPaginated, getFeaturedHomepageLibraryCount } from "@/services/library";

/** Digital library items, as on /admin/library; `q` searches title, author and topic. Includes the form's options. */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/library", async () => {
    const { page, pageSize, q } = staffListParams(request);
    const [{ items, totalCount }, featuredCount] = await Promise.all([
      getAllLibraryItemsPaginated(page, pageSize, q || undefined),
      getFeaturedHomepageLibraryCount(),
    ]);
    return { ...pagedBody(items.map(libraryItemBody), totalCount, page, pageSize), ...libraryFormOptions(featuredCount) };
  });
}

/**
 * New item (multipart): title, author, topic, level (Beginner|Intermediate|Advanced), language, pdfUrl
 * (http/https link to the PDF), published ("on"), featuredOnHomepage ("on"), image (cover file, optional).
 */
export async function POST(request: NextRequest) {
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/library POST", async () => createLibraryItem(await readActionForm(request)));
}
