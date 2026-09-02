import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { prisma } from "@/utils/prisma";

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
    const { rating, quote, course, location } = body;

    if (!rating || !quote) {
      return NextResponse.json(
        { success: false, error: "Rating and review text are required." },
        { status: 400 }
      );
    }

    const review = await prisma.studentReview.create({
      data: {
        userId: user.id,
        name: user.name || "Student",
        rating: Number(rating),
        quote: String(quote).trim(),
        course: course ? String(course).trim() : null,
        location: location ? String(location).trim() : null,
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
