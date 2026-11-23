import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/services/api-auth";
import { createContactInquiry } from "@/services/contact-inquiries";
import { enforceRateLimit, getClientIp, RATE_LIMIT_MESSAGE, RATE_LIMITS } from "@/services/rate-limit";
import { contactInquirySchema } from "@/utils/validations";
import { apiError, apiServerError, readJson } from "@/utils/api-response";

/**
 * Contact form: `{ name, email, phone?, message }`. Works signed out; with a
 * Bearer token the account's name and e-mail are used and the message is
 * linked to the account (as on the website).
 */
export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(RATE_LIMITS.CONTACT_IP, getClientIp(request.headers), {
    success: false,
    error: RATE_LIMIT_MESSAGE,
  });
  if (limited) return limited;

  try {
    const { user } = request.headers.get("authorization") ? await authenticateApiRequest(request) : { user: null };
    const body = (await readJson(request)) ?? {};
    const parsed = contactInquirySchema.safeParse({
      name: body.name ?? user?.name ?? "",
      email: body.email ?? user?.email ?? "",
      phone: body.phone ?? "",
      message: body.message,
    });
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid form data.", 400);

    const inquiry = await createContactInquiry({ sender: user, ...parsed.data });
    return NextResponse.json({ success: true, inquiry }, { status: 201 });
  } catch (error) {
    return apiServerError("api/v1/contact", error, "Failed to send the message.");
  }
}
