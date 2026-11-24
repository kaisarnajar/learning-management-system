import { NextRequest } from "next/server";
import { createDailyInspiration } from "@/app/admin/daily-inspiration/actions";
import { ADMIN_ROLES, pagedBody, readActionForm, staffAction, staffListParams, staffRead } from "@/services/api-staff";
import {
  dailyInspirationKindLabel,
  dailyInspirationStatusBadge,
  getAllDailyInspirationsForAdminPaginated,
  getHomepageDailyInspirationId,
} from "@/services/daily-inspiration";

/**
 * Verse & Hadith of the Day entries, last updated first, as on /admin/daily-inspiration; `q` searches the Arabic,
 * the translation and the reference. The latest published entry is the one on the homepage (`onHomepage`).
 */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/daily-inspiration", async () => {
    const { page, pageSize, q } = staffListParams(request);
    const [{ items, totalCount }, homepageId] = await Promise.all([
      getAllDailyInspirationsForAdminPaginated(page, pageSize, q || undefined),
      getHomepageDailyInspirationId(),
    ]);
    return pagedBody(
      items.map((item) => ({
        ...item,
        kindLabel: dailyInspirationKindLabel(item.kind),
        statusLabel: dailyInspirationStatusBadge(item, homepageId).label,
        onHomepage: item.published && item.id === homepageId,
      })),
      totalCount,
      page,
      pageSize,
    );
  });
}

/** New entry: kind (QURAN|HADITH), arabicText, englishTranslation, reference (optional), published ("on"). */
export async function POST(request: NextRequest) {
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/daily-inspiration POST", async () =>
    createDailyInspiration(await readActionForm(request)),
  );
}
