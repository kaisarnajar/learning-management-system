"use client";

import Link from "next/link";
import { useState } from "react";
import { generateReceipt } from "@/app/actions/receipts";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/shared/ToastProvider";

interface ReceiptActionButtonsProps {
  paymentRecordId: string;
  receiptGeneratedAt: Date | null;
  isAdmin?: boolean;
  label?: string;
}

export function ReceiptActionButtons({
  paymentRecordId,
  receiptGeneratedAt,
  isAdmin = false,
  label = "View Receipt",
}: ReceiptActionButtonsProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const { addToast } = useToast();

  const handleGenerate = async () => {
    setIsPending(true);
    try {
      await generateReceipt(paymentRecordId);
      addToast("Receipt generated successfully.", "success");
      router.push(`/admin/receipts/${paymentRecordId}`);
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Failed to generate receipt";
      addToast(msg, "error");
    } finally {
      setIsPending(false);
    }
  };

  const btnClass = "inline-flex min-h-9 items-center justify-center rounded-md border border-primary bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors disabled:opacity-60";

  if (!isAdmin) {
    return null;
  }

  if (receiptGeneratedAt) {
    return (
      <Link
        href={`/admin/receipts/${paymentRecordId}`}
        className={btnClass}
      >
        {label}
      </Link>
    );
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={isPending}
      className={btnClass}
    >
      {isPending ? "Generating…" : "Generate Receipt"}
    </button>
  );
}
