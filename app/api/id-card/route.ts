import { NextResponse } from "next/server";
import { auth } from "@/services/auth";
import { enforceRateLimit, RATE_LIMITS } from "@/services/rate-limit";
import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";
import { generateIdCardPdf } from "@/utils/id-card-html";
import { isAdminSession } from "@/services/admin";
import { isUserProfileComplete } from "@/services/profile";
import { pdfResponse } from "@/utils/pdf-response";

// Chromium cold start plus rendering can exceed the default function timeout.
export const maxDuration = 60;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  const limited = await enforceRateLimit(RATE_LIMITS.DOCUMENT_USER, session?.user?.id ?? "anonymous");
  if (limited) return limited;
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const inline = searchParams.get("inline") === "1";
  const requestedUserId = searchParams.get("userId");

  if (!requestedUserId) {
    return NextResponse.json({ error: "userId parameter is required." }, { status: 400 });
  }

  const targetUserId = requestedUserId;

  const user = await withDbErrorHandling(() => prisma.user.findUnique({
    where: { id: targetUserId },
  }), "Database operation failed");

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // The same rule as the staff API: an ID card needs the details printed on it.
  if (!(await isUserProfileComplete(user.id))) {
    return NextResponse.json({ error: "The student must complete their profile first." }, { status: 409 });
  }

  try {
    const pdfBuffer = await generateIdCardPdf(user);
    return pdfResponse(pdfBuffer, `ID Card ${user.name?.trim() || "Student"}`, { inline });
  } catch (error) {
    console.error("[api/id-card] PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate the ID card." }, { status: 500 });
  }
}
