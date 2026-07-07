"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { generateReceipt } from "@/app/actions/receipts";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/shared/ActionButton";
import { useToast } from "@/components/shared/ToastProvider";
import { PAYMENTS } from "@/config/constants/payments";

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
  const [isOpen, setIsOpen] = useState(false);
  const [isPendingGst, setIsPendingGst] = useState(false);
  const [isPendingNoGst, setIsPendingNoGst] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && dialog && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const { addToast } = useToast();

  const handleGenerate = async (includeGst: boolean) => {
    if (includeGst) setIsPendingGst(true);
    else setIsPendingNoGst(true);

    try {
      await generateReceipt(paymentRecordId, includeGst);
      setIsOpen(false);
      addToast("Receipt generated successfully.", "success");
      router.push(`/admin/receipts/${paymentRecordId}`);
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Failed to generate receipt";
      addToast(msg, "error");
    } finally {
      if (includeGst) setIsPendingGst(false);
      else setIsPendingNoGst(false);
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
    <>
      <button onClick={() => setIsOpen(true)} className={btnClass}>
        Generate Receipt
      </button>

      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault();
          if (!isPendingGst && !isPendingNoGst) setIsOpen(false);
        }}
        className="backdrop:bg-black/50 backdrop:backdrop-blur-sm fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-md p-6 bg-surface rounded-xl shadow-xl border border-border open:animate-in open:fade-in-90 open:zoom-in-95 m-0 overflow-hidden text-left"
      >
        <h3 className="text-lg font-semibold text-foreground">Generate Receipt</h3>
        <p className="mt-2 text-sm text-muted">
          Do you want to include GST at {PAYMENTS.GST_PERCENTAGE}% inclusive?
        </p>
        
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={isPendingGst || isPendingNoGst}
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted rounded-md transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          
          <ActionButton
            action={() => handleGenerate(false)}
            variant="secondary"
          >
            No, without GST
          </ActionButton>

          <ActionButton
            action={() => handleGenerate(true)}
            variant="primary"
          >
            Yes, include GST
          </ActionButton>
        </div>
      </dialog>
    </>
  );
}
