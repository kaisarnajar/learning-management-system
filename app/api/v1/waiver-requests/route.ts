import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { prisma } from "@/utils/prisma";

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
      data: requests,
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
    const body = await request.json();
    const { courseId, reason } = body;

    if (!courseId || !reason || reason.length < 10) {
      return NextResponse.json(
        { success: false, error: "Please select a course and provide a reason (at least 10 characters)." },
        { status: 400 }
      );
    }

    const existing = await prisma.couponRequest.findFirst({
      where: {
        userId: user.id,
        courseId,
        status: "PENDING",
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "You already have a pending waiver request for this course." },
        { status: 400 }
      );
    }

    const created = await prisma.couponRequest.create({
      data: {
        userId: user.id,
        courseId,
        reason,
        status: "PENDING",
      },
    });

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
