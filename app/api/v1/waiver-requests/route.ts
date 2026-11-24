import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { prisma } from "@/utils/prisma";
import { createWaiverRequest, resolveWaiverFeeType, withIssuedCouponCodes } from "@/services/waiver-requests";
import { waiverRequestSchema } from "@/utils/validations";
import { apiError, apiServerError } from "@/utils/api-response";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const requests = await prisma.couponRequest.findMany({
      where: { userId: user.id },
      include: {
        course: { select: { id: true, title: true } },
        coupon: { select: { id: true, code: true, percentage: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      // feeType is filled from the legacy reason prefix for rows that predate the column.
      // couponCodes lists every issued code (two for a "both fees" waiver); coupon is the first.
      data: (await withIssuedCouponCodes(requests)).map((request) => ({ ...request, feeType: resolveWaiverFeeType(request) })),
    });
  } catch (error) {
    return apiServerError("api/v1/waiver-requests", error, "Failed to fetch waiver requests.");
  }
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid request body.", 400);
    }
    const raw = (body ?? {}) as Record<string, unknown>;
    const parsed = waiverRequestSchema.safeParse({
      courseId: raw.courseId,
      // Older app builds send no feeType; they always meant both fees.
      feeType: typeof raw.feeType === "string" ? raw.feeType.toLowerCase() : "both",
      reason: raw.reason,
    });
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid request.", 400);
    }

    const result = await createWaiverRequest(user.id, parsed.data);
    if (!result.ok) {
      return apiError(result.error, result.status);
    }

    const created = await prisma.couponRequest.findUnique({ where: { id: result.id } });

    return NextResponse.json({
      success: true,
      data: created,
    });
  } catch (error) {
    return apiServerError("api/v1/waiver-requests", error, "Failed to submit fee waiver request.");
  }
}
