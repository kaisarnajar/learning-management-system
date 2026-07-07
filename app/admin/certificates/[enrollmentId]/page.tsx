import { requireAdmin } from "@/services/auth-actions";
import { prisma } from "@/utils/prisma";
import { CertificatePreview } from "@/components/certificate/CertificatePreview";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ enrollmentId: string }>;
};

export default async function AdminCertificatePreviewPage({ params }: PageProps) {
  await requireAdmin();
  const { enrollmentId } = await params;

  // Verify enrollment exists and has certificate generated
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      certificateGeneratedAt: true,
    },
  });

  if (!enrollment || !enrollment.certificateGeneratedAt) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/certificates"
        className="text-sm text-primary hover:underline mb-4 inline-block"
      >
        ← Back to Certificates
      </Link>
      <CertificatePreview enrollmentId={enrollmentId} />
    </div>
  );
}
