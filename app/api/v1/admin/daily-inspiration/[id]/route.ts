import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { deleteDailyInspiration, updateDailyInspiration } from "@/app/admin/daily-inspiration/actions";
import { ADMIN_ROLES, readActionForm, staffAction, staffRead } from "@/services/api-staff";
import { NOT_FOUND_CODE, withErrorCodes } from "@/services/api-content";
import {
  dailyInspirationKindLabel,
  dailyInspirationStatusBadge,
  getDailyInspirationForAdmin,
  getHomepageDailyInspirationId,
} from "@/services/daily-inspiration";

type Params = { params: Promise<{ id: string }> };

const CODES = NOT_FOUND_CODE("Entry");

/** One entry as /admin/daily-inspiration/[id] shows it. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/daily-inspiration/[id]", async () => {
    const [item, homepageId] = await Promise.all([getDailyInspirationForAdmin(id), getHomepageDailyInspirationId()]);
    if (!item) notFound();
    return {
      item: {
        ...item,
        kindLabel: dailyInspirationKindLabel(item.kind),
        statusLabel: dailyInspirationStatusBadge(item, homepageId).label,
        onHomepage: item.published && item.id === homepageId,
      },
    };
  });
}

/** Edit: the create fields. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/daily-inspiration/[id] PATCH", async () => {
    const form = await readActionForm(request);
    return withErrorCodes(() => updateDailyInspiration(id, form), CODES);
  });
}

/** Deletes the entry. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/daily-inspiration/[id] DELETE", () =>
    withErrorCodes(() => deleteDailyInspiration(id), CODES),
  );
}
