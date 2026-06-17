"use client";

import { confirmMonthlyPayment } from "@/app/admin/payment-approvals/actions";
import { ActionButton } from "@/components/shared/ActionButton";

export function ConfirmMonthlyPaymentButton({ submissionId }: { submissionId: string }) {
  return (
    <ActionButton
      action={(returnTo) => confirmMonthlyPayment(submissionId, returnTo)}
      confirmMessage="Approve this payment and record it on the student's account?"
    >
      Approve
    </ActionButton>
  );
}
