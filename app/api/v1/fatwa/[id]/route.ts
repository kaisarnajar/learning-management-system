import { NextRequest, NextResponse } from "next/server";
import { getAnsweredFatwaById } from "@/services/fatwa";
import { toPublicFatwaDto } from "@/services/api-dto";
import { apiError, apiServerError } from "@/utils/api-response";

/** One answered, approved fatwa. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const fatwa = await getAnsweredFatwaById(id);
    if (!fatwa) return apiError("Fatwa not found.", 404);
    return NextResponse.json({ success: true, fatwa: toPublicFatwaDto(fatwa) });
  } catch (error) {
    return apiServerError("api/v1/fatwa/[id]", error, "Failed to fetch the fatwa.");
  }
}
