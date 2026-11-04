"use client";

import { cloneElement, isValidElement, useEffect, useId, useRef, useState, ReactNode } from "react";
import { ActionButton } from "./ActionButton";
import { inputClassName } from "@/utils/form";

interface ConfirmationModalProps {
  trigger: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  /** Receives the reason text when `reasonLabel` is set. */
  onConfirm: (reason?: string) => Promise<void> | void;
  variant?: "destructive" | "primary";
  /** When set, a reason textarea is shown and must be filled before confirming. */
  reasonLabel?: string;
  reasonRequired?: boolean;
}

export function ConfirmationModal({
  trigger,
  title,
  description,
  actionLabel = "Confirm",
  onConfirm,
  variant = "destructive",
  reasonLabel,
  reasonRequired = true,
}: ConfirmationModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [reason, setReason] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && dialog && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      if (!isPending) setIsOpen(false);
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [isPending]);

  const reasonMissing = Boolean(reasonLabel) && reasonRequired && reason.trim().length < 3;

  const handleConfirm = async () => {
    if (reasonMissing) return;
    setIsPending(true);
    try {
      await onConfirm(reasonLabel ? reason.trim() : undefined);
      setIsOpen(false);
      setReason("");
    } finally {
      // Errors propagate to ActionButton, which surfaces them as a toast.
      setIsPending(false);
    }
  };

  return (
    <>
      {isValidElement<{ onClick?: (event: React.MouseEvent) => void }>(trigger) ? (
        cloneElement(trigger, {
          onClick: (event: React.MouseEvent) => {
            trigger.props.onClick?.(event);
            if (!event.defaultPrevented) setIsOpen(true);
          },
        })
      ) : (
        <button type="button" onClick={() => setIsOpen(true)}>
          {trigger}
        </button>
      )}

      <dialog
        ref={dialogRef}
        className="backdrop:bg-black/50 backdrop:backdrop-blur-sm fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-md p-6 bg-surface rounded-xl shadow-xl border border-border open:animate-in open:fade-in-90 open:zoom-in-95 m-0 overflow-hidden text-left whitespace-normal"
        aria-labelledby={titleId}
      >
        <h3 id={titleId} className="text-lg font-semibold text-foreground leading-snug break-words whitespace-normal">{title}</h3>
        <p className="mt-2 text-sm text-muted break-words leading-relaxed whitespace-normal">{description}</p>

        {reasonLabel && (
          <label className="mt-4 block text-sm">
            <span className="font-medium text-foreground">{reasonLabel}</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              className={`${inputClassName} mt-1`}
              placeholder="Recorded in the audit log"
              disabled={isPending}
            />
          </label>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted rounded-md transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <ActionButton
            action={handleConfirm}
            variant={variant}
            disabled={reasonMissing}
          >
            {actionLabel}
          </ActionButton>
        </div>
      </dialog>
    </>
  );
}
