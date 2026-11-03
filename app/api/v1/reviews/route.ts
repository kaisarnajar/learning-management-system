import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { prisma } from "@/utils/prisma";
import { studentReviewSchema } from "@/utils/validations";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const reviews = await prisma.studentReview.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    console.error("[api/v1/reviews] GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reviews." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const parsed = studentReviewSchema.safeParse({
      quote: body?.quote,
      course: body?.course ?? "",
      location: body?.location ?? "",
      rating: body?.rating,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid review." },
        { status: 400 }
      );
    }

    const review = await prisma.studentReview.create({
      data: {
        userId: user.id,
        rating: parsed.data.rating,
        quote: parsed.data.quote,
        course: parsed.data.course || null,
        location: parsed.data.location || null,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Thank you! Your review was submitted for admin approval.",
      review,
    });
  } catch (error) {
    console.error("[api/v1/reviews] POST Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit review." },
      { status: 500 }
    );
  }
}
