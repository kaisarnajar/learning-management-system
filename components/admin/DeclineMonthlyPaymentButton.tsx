"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { declineMonthlyPayment } from "@/app/admin/payment-approvals/actions";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export function DeclineMonthlyPaymentButton({ submissionId }: { submissionId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();

  if (hidden) return null;

  function getReturnTo() {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function handleDecline() {
    if (!window.confirm("Decline this payment? The student will need to submit payment details again.")) return;

    startTransition(async () => {
      try {
        const result = await declineMonthlyPayment(submissionId, getReturnTo());
        if (result?.error) {
          window.alert(result.error);
          return;
        }
        setHidden(true);
      } catch (error) {
        if (isRedirectError(error)) {
          setHidden(true);
          return;
        }
        window.alert("Could not decline payment. Please try again.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleDecline}
      disabled={pending}
      className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-red-100 disabled:opacity-60"
    >
      {pending ? "…" : "Decline"}
    </button>
  );
}
