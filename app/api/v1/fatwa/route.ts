import { NextRequest, NextResponse } from "next/server";
import { getAnsweredFatwasPaginated } from "@/services/fatwa";
import { prisma } from "@/utils/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await getAnsweredFatwasPaginated(page, pageSize, category, search);

    return NextResponse.json({
      success: true,
      data: result.items,
      totalCount: result.totalCount,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("[api/v1/fatwa] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch fatwas." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, question, category, askerName, askerEmail } = body;

    if (!title || !question || !askerName || !askerEmail) {
      return NextResponse.json(
        { success: false, error: "Title, question, asker name, and email are required." },
        { status: 400 }
      );
    }

    const newFatwa = await prisma.fatwaQuestion.create({
      data: {
        title,
        question,
        category: category || "General",
        askerName,
        askerEmail,
        approvalStatus: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Fatwa question submitted successfully and pending review.",
      data: newFatwa,
    });
  } catch (error) {
    console.error("[api/v1/fatwa] POST Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit fatwa question." },
      { status: 500 }
    );
  }
}
