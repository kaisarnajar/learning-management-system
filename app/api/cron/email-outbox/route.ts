import { NextResponse } from "next/server";
import { drainOutbox } from "@/services/email-outbox";
import { isAuthorizedCronRequest } from "@/utils/cron-auth";
import { apiError } from "@/utils/api-response";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Leaves headroom under maxDuration for the batch in flight. */
const SEND_BUDGET_MS = 45_000;

/** Sends queued bulk e-mail in batches (vercel.json cron). Requires CRON_SECRET. */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return apiError("Unauthorized", 401);
  }
  const result = await drainOutbox({ budgetMs: SEND_BUDGET_MS });
  return NextResponse.json({ success: true, ...result });
}
