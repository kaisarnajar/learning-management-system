import { NextRequest } from "next/server";
import { getHomepageDailyInspiration } from "@/services/daily-inspiration";
import { apiServerError, publicJson } from "@/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const inspiration = await getHomepageDailyInspiration();
    return publicJson(request, {
      success: true,
      inspiration,
    });
  } catch (error) {
    return apiServerError("api/v1/daily-inspiration", error, "Failed to fetch daily inspiration.");
  }
}
