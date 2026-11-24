import { NextRequest } from "next/server";
import { createBook } from "@/app/admin/bookstore/actions";
import { ADMIN_ROLES, pagedBody, readActionForm, staffAction, staffListParams, staffRead } from "@/services/api-staff";
import { getAllBooksPaginated, getFeaturedHomepageBookCount } from "@/services/bookstore";
import { featuredSlots, serializeBook } from "./serialize";

/** The book catalogue, as on /admin/bookstore (newest first; `q` searches title and author). */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/bookstore", async () => {
    const { page, pageSize, q } = staffListParams(request);
    const [{ items, totalCount }, featuredCount] = await Promise.all([
      getAllBooksPaginated(page, pageSize, q || undefined),
      getFeaturedHomepageBookCount(),
    ]);
    // The service clamps a page past the end to the last page; the app pages on, so answer that with nothing.
    const pastEnd = page > 1 && (page - 1) * pageSize >= totalCount;
    return { ...pagedBody(pastEnd ? [] : items.map(serializeBook), totalCount, page, pageSize), ...featuredSlots(featuredCount) };
  });
}

/**
 * Adds a book (the /admin/bookstore/new form), multipart or JSON: title, author, description, priceInr, mrpInr
 * (may be empty), purchasePriceInr, inventoryPurchased, weightInGrams, status (AVAILABLE | OUT_OF_STOCK |
 * COMING_SOON), published and featuredOnHomepage ("on"/"true" when ticked), image (cover file, optional).
 */
export async function POST(request: NextRequest) {
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/bookstore POST", async () => createBook(await readActionForm(request)));
}
