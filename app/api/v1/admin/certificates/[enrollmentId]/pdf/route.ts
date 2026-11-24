import { NextRequest, NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { ADMIN_ROLES, staffRead } from "@/services/api-staff";
import { getCertificateEnrollment } from "@/services/certificates-admin";
import { getCertificatePdf } from "@/services/documents";
import { RATE_LIMIT_MESSAGE, RATE_LIMITS, rateLimit } from "@/services/rate-limit";
import { apiError } from "@/utils/api-response";

// Chromium cold start plus rendering can exceed the default function timeout.
export const maxDuration = 60;

type Params = { params: Promise<{ enrollmentId: string }> };

/** The certificate as a PDF (the stored file, rendered when none is stored), as /api/certificate/[id] serves the page. */
export async function GET(request: NextRequest, { params }: Params) {
  const { enrollmentId } = await params;
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/certificates/[enrollmentId]/pdf", async ({ user }) => {
    if (!(await rateLimit(RATE_LIMITS.DOCUMENT_USER, user.id)).ok) return apiError(RATE_LIMIT_MESSAGE, 429);
    const enrollment = await getCertificateEnrollment(enrollmentId);
    if (!enrollment) notFound();
    if (!enrollment.certificateGeneratedAt || !enrollment.certificateNumber) {
      return apiError("Certificate has not been generated yet.", 400);
    }
    const { pdf, filename } = await getCertificatePdf(enrollment, enrollment.course.title);
    return new NextResponse(new Uint8Array(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${filename}"`, "Cache-Control": "private, no-store" },
    });
  });
}
