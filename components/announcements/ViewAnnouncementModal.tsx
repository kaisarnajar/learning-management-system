"use client";

import { useEffect, useRef, useState } from "react";

type ViewAnnouncementModalProps = {
  title: string;
  body: string;
};

export function ViewAnnouncementModal({ title, body }: ViewAnnouncementModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && dialog && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      setIsOpen(false);
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, []);

  // Close when clicking outside the dialog content
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs font-medium text-primary transition-colors hover:text-primary-light"
      >
        View Announcement
        <svg
          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      <dialog
        ref={dialogRef}
        onClick={handleBackdropClick}
        className="backdrop:bg-black/50 backdrop:backdrop-blur-sm fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-2xl p-6 md:p-8 bg-surface rounded-xl shadow-xl border border-border open:animate-in open:fade-in-90 open:zoom-in-95 m-0 overflow-y-auto max-h-[85vh] text-left"
      >
        <div className="flex justify-between items-start gap-4">
          <h2 className="text-xl md:text-2xl font-serif font-semibold text-foreground break-words">{title}</h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-muted hover:text-foreground transition-colors shrink-0 p-1"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-6 prose prose-sm md:prose-base dark:prose-invert max-w-none text-foreground whitespace-pre-wrap leading-relaxed">
          {body}
        </div>
        
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm font-medium text-foreground bg-surface-muted hover:bg-border rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}
