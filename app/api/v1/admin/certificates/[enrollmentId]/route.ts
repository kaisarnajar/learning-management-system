import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { deleteCertificate } from "@/app/actions/certificates";
import { ADMIN_ROLES, staffAction, staffRead } from "@/services/api-staff";
import { getCertificateEnrollment } from "@/services/certificates-admin";

type Params = { params: Promise<{ enrollmentId: string }> };

/** One generated certificate, as on /admin/certificates/[enrollmentId] (the file itself: ./pdf). */
export async function GET(request: NextRequest, { params }: Params) {
  const { enrollmentId } = await params;
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/certificates/[enrollmentId]", async () => {
    const e = await getCertificateEnrollment(enrollmentId);
    if (!e || !e.certificateGeneratedAt) notFound();
    return {
      certificate: {
        enrollmentId: e.id,
        certificateNumber: e.certificateNumber,
        certificateGeneratedAt: e.certificateGeneratedAt,
        certificateType: e.certificateType,
        typeLabel: e.certificateType === "APPRECIATION" ? "Appreciation" : "Completion",
        certificateGrade: e.certificateGrade,
        certificateEmailSentAt: e.certificateEmailSentAt,
        user: { id: e.user.id, name: e.user.name, email: e.user.email },
        course: e.course,
      },
    };
  });
}

/** Deletes the certificate (and its stored PDF); the enrollment stays and can be issued a new one. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { enrollmentId } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/certificates/[enrollmentId] DELETE", () => deleteCertificate(enrollmentId));
}
