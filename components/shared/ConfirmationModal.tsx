"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { ActionButton } from "./ActionButton";

interface ConfirmationModalProps {
  trigger: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onConfirm: () => Promise<void> | void;
  variant?: "destructive" | "primary";
}

export function ConfirmationModal({
  trigger,
  title,
  description,
  actionLabel = "Confirm",
  onConfirm,
  variant = "destructive",
}: ConfirmationModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  const handleConfirm = async () => {
    setIsPending(true);
    try {
      await onConfirm();
      setIsOpen(false);
    } catch {
      // Error handling can be caught by ActionButton or parent
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)} className="inline-block">
        {trigger}
      </div>

      <dialog
        ref={dialogRef}
        className="backdrop:bg-black/50 backdrop:backdrop-blur-sm fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-md p-6 bg-surface rounded-xl shadow-xl border border-border open:animate-in open:fade-in-90 open:zoom-in-95 m-0 overflow-hidden"
      >
        <h3 className="text-lg font-semibold text-foreground break-words">{title}</h3>
        <p className="mt-2 text-sm text-muted break-words whitespace-pre-wrap">{description}</p>
        
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
          >
            {actionLabel}
          </ActionButton>
        </div>
      </dialog>
    </>
  );
}
