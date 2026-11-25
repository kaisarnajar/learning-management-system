import { auth } from "@/services/auth";
import { enforceRateLimit, RATE_LIMITS } from "@/services/rate-limit";
import { isAdminSession } from "@/services/admin";
import { getCourseById } from "@/services/courses";
import { getCertificatePdf } from "@/services/documents";
import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";
import { pdfResponse } from "@/utils/pdf-response";
import { apiError } from "@/utils/api-response";

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
    return apiError("Unauthorized.", 401);
  }

  const enrollment = await withDbErrorHandling(() => prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        user: { select: { id: true, name: true, email: true, address: true, whatsapp: true } },
      },
    }), "Database operation failed");

  if (!enrollment) {
    return apiError("Certificate is not available yet.", 404);
  }

  const course = await getCourseById(enrollment.courseId);
  if (!course) {
    return apiError("Course not found.", 404);
  }

  if (!enrollment.certificateGeneratedAt || !enrollment.certificateNumber) {
    return apiError("Certificate has not been generated yet.", 400);
  }

  try {
    // The stored file when the certificate was rendered at issue time;
    // Chromium only for enrollments without one.
    const { pdf: pdfBuffer, filename } = await getCertificatePdf(enrollment, course.title);

    return pdfResponse(pdfBuffer, filename, { inline });
  } catch (error) {
    const err = error as Error;
    console.error("PDF Generation Error:", err.stack || err);
    return apiError("Failed to generate PDF", 500);
  }
}
