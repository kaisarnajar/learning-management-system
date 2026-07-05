"use client";

import { useRouter } from "next/navigation";
import { ConfirmationModal } from "./ConfirmationModal";
import { useToast } from "@/components/shared/ToastProvider";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { adminDestructiveButtonClassName } from "@/lib/form";

export function DeleteActionButton({
  action,
  title = "Delete",
  itemName,
  warningMessage,
  disabled = false,
  className,
  onSuccessRedirect,
}: {
  action: () => Promise<{ error?: string } | void | unknown> | void;
  title?: string;
  itemName: string;
  warningMessage?: string;
  disabled?: boolean;
  className?: string;
  onSuccessRedirect?: string;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  
  const defaultClass = adminDestructiveButtonClassName;
  const buttonClass = className || defaultClass;

  const trigger = (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        if (warningMessage) {
           e.stopPropagation();
           e.preventDefault();
           addToast(warningMessage, "warning");
           return;
        }
      }}
      className={buttonClass}
    >
      {title}
    </button>
  );

  if (warningMessage || disabled) {
    return trigger;
  }

  return (
    <ConfirmationModal
      trigger={trigger}
      title={`Delete ${itemName}`}
      description={`Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
      actionLabel="Delete"
      variant="destructive"
      onConfirm={async () => {
        try {
          const result = await action();
          if (result && typeof result === "object" && 'error' in result && result.error) {
             addToast(result.error as string, "error");
             return;
          }
          if (result && typeof result === "object" && 'success' in result && result.success) {
             addToast(result.success as string, "success");
          }
          if (onSuccessRedirect) {
             router.push(onSuccessRedirect);
          }
        } catch (error) {
          if (isRedirectError(error)) {
             throw error;
          }
          addToast("An unexpected error occurred during deletion.", "error");
        }
      }}
    />
  );
}
