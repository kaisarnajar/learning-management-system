"use client";

import { declineMonthlyPayment } from "@/app/admin/payments/actions";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { usePathname, useSearchParams } from "next/navigation";
import { getReturnToUrl } from "@/components/shared/ActionButton";

export function DeclineMonthlyPaymentButton({ submissionId }: { submissionId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = getReturnToUrl(pathname, searchParams);

  return (
    <ConfirmationModal
      title="Decline Payment"
      description="Decline this payment? The student will need to submit payment details again."
      actionLabel="Decline"
      variant="destructive"
      onConfirm={async () => {
         const result = await declineMonthlyPayment(submissionId, returnTo);
         if (result?.error) { window.alert(result.error); }
      }}
      trigger={
        <button type="button" className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60">
          Decline
        </button>
      }
    />
  );
}
