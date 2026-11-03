import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { prisma } from "@/utils/prisma";
import { createWaiverRequest, resolveWaiverFeeType } from "@/services/waiver-requests";
import { waiverRequestSchema } from "@/utils/validations";

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
      data: requests.map((request) => ({ ...request, feeType: resolveWaiverFeeType(request) })),
    });
  } catch (error) {
    console.error("[api/v1/waiver-requests] GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch waiver requests." },
      { status: 500 }
    );
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
      return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
    }
    const raw = (body ?? {}) as Record<string, unknown>;
    const parsed = waiverRequestSchema.safeParse({
      courseId: raw.courseId,
      // Older app builds send no feeType; they always meant both fees.
      feeType: typeof raw.feeType === "string" ? raw.feeType.toLowerCase() : "both",
      reason: raw.reason,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 }
      );
    }

    const result = await createWaiverRequest(user.id, parsed.data);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    const created = await prisma.couponRequest.findUnique({ where: { id: result.id } });

    return NextResponse.json({
      success: true,
      data: created,
    });
  } catch (error) {
    console.error("[api/v1/waiver-requests] POST Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit fee waiver request." },
      { status: 500 }
    );
  }
}
