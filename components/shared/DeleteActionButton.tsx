"use client";

import { useRouter } from "next/navigation";
import { ConfirmationModal } from "./ConfirmationModal";
import { useToast } from "@/components/shared/ToastProvider";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { Button } from "../ui/Button";

type ActionResult = { error?: string; success?: string } | void | unknown;

export function DeleteActionButton({
  action,
  title,
  verb = "Delete",
  itemName,
  warningMessage,
  disabled = false,
  className,
  onSuccessRedirect,
  reasonLabel,
  description,
}: {
  /** Receives the reason when `reasonLabel` is set. */
  action: (reason?: string) => Promise<ActionResult> | void;
  title?: string;
  /** Wording for the button and dialog: "Delete" removes, "Void" keeps the record but excludes it. */
  verb?: "Delete" | "Void" | "Remove";
  itemName: string;
  warningMessage?: string;
  disabled?: boolean;
  className?: string;
  onSuccessRedirect?: string;
  /** Show a required reason field (stored in the audit log). */
  reasonLabel?: string;
  description?: string;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const label = title ?? verb;

  const trigger = (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={disabled}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        if (warningMessage) {
          e.stopPropagation();
          e.preventDefault();
          addToast(warningMessage, "warning");
          return;
        }
      }}
      className={className}
    >
      {label}
    </Button>
  );

  if (warningMessage || disabled) {
    return trigger;
  }

  const defaultDescription =
    verb === "Void"
      ? `Void "${itemName}"? It stays on record for auditing but is excluded from finance, receipts and the student's history.`
      : `Are you sure you want to ${verb.toLowerCase()} "${itemName}"? This action cannot be undone.`;

  return (
    <ConfirmationModal
      trigger={trigger}
      title={`${verb} ${itemName}`}
      description={description ?? defaultDescription}
      actionLabel={verb}
      variant="destructive"
      reasonLabel={reasonLabel}
      onConfirm={async (reason) => {
        try {
          const result = await action(reason);
          if (result && typeof result === "object" && "error" in result && result.error) {
            addToast(result.error as string, "error");
            return;
          }
          if (result && typeof result === "object" && "success" in result && result.success) {
            addToast(result.success as string, "success");
          }
          if (onSuccessRedirect) {
            router.push(onSuccessRedirect);
          }
        } catch (error) {
          if (isRedirectError(error)) {
            throw error;
          }
          addToast(`An unexpected error occurred while trying to ${verb.toLowerCase()}.`, "error");
        }
      }}
    />
  );
}
