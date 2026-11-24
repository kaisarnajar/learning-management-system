import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { toPaymentRecordDto, toPaymentSubmissionDto } from "@/services/api-dto";
import { prisma } from "@/utils/prisma";
import { apiServerError } from "@/utils/api-response";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const [submissions, records] = await Promise.all([
      prisma.coursePaymentSubmission.findMany({
        where: { userId: user.id, deletedAt: null },
        orderBy: { createdAt: "desc" },
      }),
      prisma.paymentRecord.findMany({
        where: { userId: user.id, voidedAt: null },
        orderBy: { paidAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      submissions: submissions.map(toPaymentSubmissionDto),
      records: records.map(toPaymentRecordDto),
    });
  } catch (error) {
    return apiServerError("api/v1/payments/history", error, "Failed to fetch payment history.");
  }
}
