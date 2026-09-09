import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { getBookOrdersForUser } from "@/services/bookstore";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const orders = await getBookOrdersForUser(user.id);
    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("[api/v1/bookstore/orders] GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch bookstore orders." },
      { status: 500 }
    );
  }
}
