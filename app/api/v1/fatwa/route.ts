import { NextRequest, NextResponse } from "next/server";
import { getAnsweredFatwasPaginated } from "@/services/fatwa";
import { prisma } from "@/utils/prisma";
import { fatwaQuestionSchema } from "@/utils/validations";
import { enforceRateLimit, getClientIp, RATE_LIMITS } from "@/services/rate-limit";
import { parseApiPagination } from "@/utils/api-pagination";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const { page, pageSize } = parseApiPagination(searchParams);
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
  const limited = await enforceRateLimit(RATE_LIMITS.FATWA_ASK_IP, getClientIp(request.headers), {
    success: false,
    error: "Too many questions submitted from this network. Please try again later.",
  });
  if (limited) return limited;

  try {
    const body = await request.json();
    const parsed = fatwaQuestionSchema.safeParse({
      title: body?.title,
      question: body?.question,
      category: body?.category || "General",
      askerName: body?.askerName,
      askerEmail: body?.askerEmail,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid fatwa question." },
        { status: 400 }
      );
    }

    const newFatwa = await prisma.fatwaQuestion.create({
      data: {
        ...parsed.data,
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
