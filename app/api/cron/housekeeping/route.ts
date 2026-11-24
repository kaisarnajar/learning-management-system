import { NextResponse } from "next/server";
import { runHousekeeping } from "@/services/housekeeping";
import { isAuthorizedCronRequest } from "@/utils/cron-auth";

export const dynamic = "force-dynamic";

/** Daily clean-up of rows that only grow (vercel.json cron). Requires CRON_SECRET. */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const deleted = await runHousekeeping();
  return NextResponse.json({ success: true, deleted });
}
