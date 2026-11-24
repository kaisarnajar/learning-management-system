import { requireAdmin } from "@/services/auth-actions";
import { getEnrollmentsAwaitingCertificate } from "@/services/certificates-admin";
import { GenerateCertificateForm } from "@/components/admin/certificates/GenerateCertificateForm";
import Link from "next/link";

export default async function AdminGenerateCertificatePage() {
  await requireAdmin();

  // Enrollments where certificate has NOT been generated yet
  const processedEnrollments = await getEnrollmentsAwaitingCertificate();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/certificates"
        className="text-sm text-primary hover:underline mb-4 inline-block"
      >
        ← Back to Certificates
      </Link>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground">Generate New Certificate</h1>
        <p className="mt-1 text-sm text-muted mb-6">
          Issue a certificate of completion or appreciation for an enrolled student.
        </p>
        <GenerateCertificateForm enrollments={processedEnrollments} />
      </div>
    </div>
  );
}
