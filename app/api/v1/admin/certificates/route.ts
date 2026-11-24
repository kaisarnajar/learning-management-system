import { NextRequest } from "next/server";
import type { CertificateType } from "@prisma/client";
import { generateCertificate } from "@/app/actions/certificates";
import { ADMIN_ROLES, pagedBody, readActionForm, staffAction, staffListParams, staffRead } from "@/services/api-staff";
import { getGeneratedCertificatesPaginated } from "@/services/certificates-admin";
import { apiError } from "@/utils/api-response";

// Generating renders the PDF once (Chromium cold start included).
export const maxDuration = 60;

const TYPES: CertificateType[] = ["APPRECIATION", "COMPLETION"];

/** Generated certificates, as on /admin/certificates (newest first; `q`: number, student or course). */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/certificates", async () => {
    const { page, pageSize, q } = staffListParams(request);
    const { items, totalCount } = await getGeneratedCertificatesPaginated(page, pageSize, q || undefined);
    return pagedBody(
      items.map((c) => ({
        enrollmentId: c.id,
        certificateNumber: c.certificateNumber,
        certificateGeneratedAt: c.certificateGeneratedAt,
        certificateType: c.certificateType,
        typeLabel: c.certificateType === "APPRECIATION" ? "Appreciation" : "Completion",
        certificateGrade: c.certificateGrade,
        user: c.user,
        course: c.course,
      })),
      totalCount,
      page,
      pageSize,
    );
  });
}

/**
 * Generate a certificate: enrollmentId, certificateType (APPRECIATION | COMPLETION), certificateGrade
 * (0–10, required for COMPLETION). Answers `result.certificateNumber`.
 */
export async function POST(request: NextRequest) {
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/certificates POST", async () => {
    const form = await readActionForm(request);
    const enrollmentId = String(form.get("enrollmentId") ?? "");
    const type = String(form.get("certificateType") ?? "") as CertificateType;
    const rawGrade = String(form.get("certificateGrade") ?? "").trim();
    if (!enrollmentId) return apiError("Please select a student.", 400);
    if (!TYPES.includes(type)) return apiError("Choose a certificate type.", 400);
    return generateCertificate(enrollmentId, type, rawGrade === "" ? undefined : Number(rawGrade));
  });
}
