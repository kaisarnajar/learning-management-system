import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { prisma } from "@/utils/prisma";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const [submissions, records] = await Promise.all([
      prisma.coursePaymentSubmission.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.paymentRecord.findMany({
        where: { userId: user.id },
        orderBy: { paidAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      submissions,
      records,
    });
  } catch (error) {
    console.error("[api/v1/payments/history] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payment history." },
      { status: 500 }
    );
  }
}
