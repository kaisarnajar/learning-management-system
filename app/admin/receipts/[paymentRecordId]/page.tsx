import { requireAdmin } from "@/services/auth-actions";
import { prisma } from "@/utils/prisma";
import { ReceiptPreview } from "@/components/payment/ReceiptPreview";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ paymentRecordId: string }>;
};

export default async function AdminReceiptPreviewPage({ params }: PageProps) {
  await requireAdmin();
  const { paymentRecordId } = await params;

  // Verify payment record exists and has receipt generated
  const record = await prisma.paymentRecord.findUnique({
    where: { id: paymentRecordId },
    select: {
      id: true,
      receiptGeneratedAt: true,
    },
  });

  if (!record || !record.receiptGeneratedAt) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/payments"
        className="text-sm text-primary hover:underline mb-4 inline-block"
      >
        ← Back to Payments
      </Link>
      <ReceiptPreview paymentRecordId={paymentRecordId} />
    </div>
  );
}
