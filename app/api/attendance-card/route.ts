import { NextResponse } from "next/server";
import { auth } from "@/services/auth";
import { enforceRateLimit, RATE_LIMITS } from "@/services/rate-limit";
import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";
import { generateAttendanceCardPdf } from "@/utils/attendance-card-html";
import { isAdminSession } from "@/services/admin";
import { contentDisposition } from "@/utils/filename";

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
  const enrollmentId = searchParams.get("enrollmentId");

  if (!enrollmentId) {
    return NextResponse.json({ error: "enrollmentId parameter is required." }, { status: 400 });
  }

  const enrollment = await withDbErrorHandling(() => prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      user: {
        select: {
          name: true,
        }
      }
    }
  }), "Database operation failed");

  if (!enrollment) {
    return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });
  }

  try {
    const pdfBuffer = await generateAttendanceCardPdf(enrollmentId);
    const displayName = `Attendance Card ${enrollment.user.name || "Student"}`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition(inline ? "inline" : "attachment", displayName, "pdf"),
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error) {
    console.error("Attendance Card API generation error:", error);
    return NextResponse.json({ error: "Failed to generate Attendance Card PDF." }, { status: 500 });
  }
}
