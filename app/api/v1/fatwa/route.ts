import { NextRequest, NextResponse } from "next/server";
import { createFatwaQuestion, getAnsweredFatwasPaginated } from "@/services/fatwa";
import { authenticateApiRequest } from "@/services/api-auth";
import { enforceRateLimit, getClientIp, RATE_LIMITS } from "@/services/rate-limit";
import { parseApiPagination } from "@/utils/api-pagination";
import { toPublicFatwaDto } from "@/services/api-dto";
import { apiError, apiServerError, INVALID_JSON_MESSAGE, readJson } from "@/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const { page, pageSize } = parseApiPagination(searchParams);
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await getAnsweredFatwasPaginated(page, pageSize, category, search);

    return NextResponse.json({
      success: true,
      data: result.items.map(toPublicFatwaDto),
      totalCount: result.totalCount,
      page,
      pageSize,
    });
  } catch (error) {
    return apiServerError("api/v1/fatwa", error, "Failed to fetch fatwas.");
  }
}

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(RATE_LIMITS.FATWA_ASK_IP, getClientIp(request.headers), {
    success: false,
    error: "Too many questions submitted from this network. Please try again later.",
  });
  if (limited) return limited;

  try {
    const body = await readJson(request);
    if (!body) return apiError(INVALID_JSON_MESSAGE, 400);
    // A signed-in student is linked to the question, as on the website; the
    // route stays open to guests.
    const { user } = request.headers.has("authorization") ? await authenticateApiRequest(request) : { user: null };
    const created = await createFatwaQuestion(
      {
        title: body.title,
        question: body.question,
        category: body.category || "General",
        askerName: body.askerName,
        askerEmail: body.askerEmail,
      },
      { asker: user ? { id: user.id, name: user.name ?? null, email: user.email } : null, isAnonymous: body.isAnonymous === true },
    );
    if (!created.ok) return apiError(created.error, 400);
    const newFatwa = created.question;

    return NextResponse.json({
      success: true,
      message: "Fatwa question submitted successfully. It will be published once a scholar answers it.",
      data: newFatwa,
    });
  } catch (error) {
    return apiServerError("api/v1/fatwa", error, "Failed to submit fatwa question.");
  }
}
