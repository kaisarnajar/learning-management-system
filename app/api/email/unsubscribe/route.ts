import { NextRequest, NextResponse } from "next/server";
import { BRAND_CONFIG } from "@/config/brand";
import { verifyUnsubscribeToken } from "@/services/email-unsubscribe";
import { enforceRateLimit, getClientIp, RATE_LIMITS } from "@/services/rate-limit";
import { escapeHtml } from "@/utils/html-escape";
import { prisma } from "@/utils/prisma";

export const dynamic = "force-dynamic";

function page(title: string, body: string, status = 200): NextResponse {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} | ${escapeHtml(BRAND_CONFIG.name)}</title>
<style>body{font-family:system-ui,sans-serif;background:#f6f5f1;margin:0;padding:40px 16px;color:#1f2937}main{max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08)}h1{font-size:20px;margin:0 0 12px}p{line-height:1.6}button{background:#0f3d2e;color:#fff;border:0;border-radius:999px;padding:12px 24px;font-size:14px;font-weight:600;cursor:pointer}</style></head>
<body><main><h1>${escapeHtml(title)}</h1>${body}</main></body></html>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

async function optOut(userId: string): Promise<boolean> {
  const updated = await prisma.user.updateMany({
    where: { id: userId, deletedAt: null },
    data: { announcementEmailsOptOut: true },
  });
  return updated.count > 0;
}

/**
 * GET shows a confirmation page (a mail scanner opening the link must not
 * change anything); the button posts back to this URL.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const userId = verifyUnsubscribeToken(token);
  if (!userId) {
    return page("Link not valid", "<p>This unsubscribe link is not valid or has been altered.</p>", 400);
  }
  return page(
    "Stop announcement emails?",
    `<p>You will no longer receive announcement emails from ${escapeHtml(BRAND_CONFIG.name)}. Notifications stay available in your account.</p>
<form method="post"><input type="hidden" name="token" value="${escapeHtml(token ?? "")}"><button type="submit">Unsubscribe</button></form>`,
  );
}

/**
 * POST opts the user out. Mail clients send `List-Unsubscribe=One-Click`
 * (RFC 8058) here with the token in the URL; the confirmation page posts
 * the token as a form field.
 */
export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(RATE_LIMITS.FORGOT_PASSWORD_IP, getClientIp(request.headers), {
    error: "Too many requests. Please try again later.",
  });
  if (limited) return limited;

  let token = request.nextUrl.searchParams.get("token");
  if (!token) {
    const form = await request.formData().catch(() => null);
    const fromForm = form?.get("token");
    token = typeof fromForm === "string" ? fromForm : null;
  }
  const userId = verifyUnsubscribeToken(token);
  if (!userId) {
    return page("Link not valid", "<p>This unsubscribe link is not valid or has been altered.</p>", 400);
  }

  await optOut(userId);

  const oneClick = request.headers.get("content-type")?.includes("application/x-www-form-urlencoded") && !request.headers.get("referer");
  if (oneClick) {
    return NextResponse.json({ success: true });
  }
  return page("You are unsubscribed", "<p>You will not receive announcement emails any more. You can still read announcements in your account.</p>");
}
