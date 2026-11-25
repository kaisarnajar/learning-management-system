import { NextResponse } from "next/server";
import { getHomepageDailyInspiration } from "@/services/daily-inspiration";
import { apiServerError } from "@/utils/api-response";

export async function GET() {
  try {
    const inspiration = await getHomepageDailyInspiration();
    return NextResponse.json({
      success: true,
      inspiration,
    });
  } catch (error) {
    return apiServerError("api/v1/daily-inspiration", error, "Failed to fetch daily inspiration.");
  }
}
