"use client";

import { declineMonthlyPayment } from "@/app/admin/payment-approvals/actions";
import { ActionButton } from "@/components/shared/ActionButton";

export function DeclineMonthlyPaymentButton({ submissionId }: { submissionId: string }) {
  return (
    <ActionButton
      action={(returnTo) => declineMonthlyPayment(submissionId, returnTo)}
      confirmMessage="Decline this payment? The student will need to submit payment details again."
      variant="destructive"
    >
      Decline
    </ActionButton>
  );
}
