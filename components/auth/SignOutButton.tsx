"use client";

import { signOut } from "next-auth/react";
import { useCallback, useId, useRef, useState } from "react";


type SignOutButtonProps = {
  className?: string;
  children?: React.ReactNode;
};

export function SignOutButton({ className, children = "Sign Out" }: SignOutButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const titleId = useId();

  const openDialog = useCallback(() => dialogRef.current?.showModal(), []);
  const closeDialog = useCallback(() => dialogRef.current?.close(), []);

  function handleConfirmSignOut() {
    setIsLoading(true);

    void signOut({ callbackUrl: "/" });
  }

  return (
    <>
      <button type="button" onClick={openDialog} className={className}>
        {children}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="backdrop:bg-black/50 backdrop:backdrop-blur-sm fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-sm p-6 bg-surface rounded-xl shadow-xl border border-border open:animate-in open:fade-in-90 open:zoom-in-95 m-0 overflow-hidden text-left"
      >
        <h2 id={titleId} className="font-serif text-lg font-bold text-foreground">
          Sign out?
        </h2>
        <p className="mt-2 text-sm text-muted">Do you want to sign out?</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closeDialog}
            className="min-h-10 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent-muted/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmSignOut}
            disabled={isLoading}
            className="min-h-10 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-light disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </dialog>
    </>
  );
}
