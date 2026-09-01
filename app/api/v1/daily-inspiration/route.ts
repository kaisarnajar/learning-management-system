import { NextRequest, NextResponse } from "next/server";
import { getHomepageDailyInspiration } from "@/services/daily-inspiration";

export async function GET(request: NextRequest) {
  try {
    const inspiration = await getHomepageDailyInspiration();
    return NextResponse.json({
      success: true,
      inspiration,
    });
  } catch (error) {
    console.error("[api/v1/daily-inspiration] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch daily inspiration." },
      { status: 500 }
    );
  }
}
