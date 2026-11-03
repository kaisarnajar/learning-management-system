import { NextResponse } from "next/server";
import { auth } from "@/services/auth";
import { enforceRateLimit, RATE_LIMITS } from "@/services/rate-limit";
import { isAdminSession } from "@/services/admin";
import { getCourseById } from "@/services/courses";
import { getCertificatePdf } from "@/services/documents";
import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";

// Chromium cold start plus rendering can exceed the default function timeout.
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ enrollmentId: string }> },
) {
  const { enrollmentId } = await params;
  const inline = new URL(request.url).searchParams.get("inline") === "1";

  const session = await auth();
  const limited = await enforceRateLimit(RATE_LIMITS.DOCUMENT_USER, session?.user?.id ?? "anonymous");
  if (limited) return limited;
  const isAdmin = isAdminSession(session);

  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const enrollment = await withDbErrorHandling(() => prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        user: { select: { id: true, name: true, email: true, address: true, whatsapp: true } },
      },
    }), "Database operation failed");

  if (!enrollment) {
    return NextResponse.json({ error: "Certificate is not available yet." }, { status: 404 });
  }

  const course = await getCourseById(enrollment.courseId);
  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  if (!enrollment.certificateGeneratedAt || !enrollment.certificateNumber) {
    return NextResponse.json({ error: "Certificate has not been generated yet." }, { status: 400 });
  }

  try {
    // The stored file when the certificate was rendered at issue time;
    // Chromium only for enrollments without one.
    const { pdf: pdfBuffer, filename } = await getCertificatePdf(enrollment, course.title);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error("PDF Generation Error:", err.stack || err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
