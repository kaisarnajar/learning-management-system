import { NextRequest } from "next/server";
import { ADMIN_ROLES, staffRead } from "@/services/api-staff";
import { getFeaturedHomepageBookCount } from "@/services/bookstore";
import { BOOK_STATUS_OPTIONS, featuredSlots } from "../serialize";

/** What the "Add book" form (/admin/bookstore/new) needs: the availability choices and the homepage slots in use. */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/bookstore/new", async () => ({
    statusOptions: BOOK_STATUS_OPTIONS,
    ...featuredSlots(await getFeaturedHomepageBookCount()),
  }));
}
