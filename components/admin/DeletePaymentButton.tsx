"use client";

import { deleteApprovedPayment } from "@/app/admin/payments/actions";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { usePathname, useSearchParams } from "next/navigation";
import { getReturnToUrl } from "@/components/shared/ActionButton";

export function DeletePaymentButton({ submissionId }: { submissionId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = getReturnToUrl(pathname, searchParams);

  return (
    <ConfirmationModal
      title="Delete Approved Payment"
      description="Are you sure you want to delete this payment? It will be permanently removed from all finance calculations and reports. This action cannot be undone."
      actionLabel="Delete"
      variant="destructive"
      onConfirm={async () => {
         const result = await deleteApprovedPayment(submissionId, returnTo);
         if (result?.error) { window.alert(result.error); }
      }}
      trigger={
        <button type="button" className="ml-2 rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60">
          Delete
        </button>
      }
    />
  );
}
