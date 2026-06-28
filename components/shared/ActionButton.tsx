"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { useToast } from "@/components/shared/ToastProvider";

export type ActionButtonVariant = "primary" | "destructive" | "secondary";

export function getReturnToUrl(pathname: string, searchParams: URLSearchParams) {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function ActionButton({
  action,
  confirmMessage,
  children,
  loadingText,
  variant = "primary",
  hideOnSuccess = true,
  className = "",
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (returnTo: string) => Promise<{ error?: string } | void | any>;
  confirmMessage?: string;
  children: React.ReactNode;
  loadingText?: React.ReactNode;
  variant?: ActionButtonVariant;
  hideOnSuccess?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();

  if (hidden) return null;

  function handleAction() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    startTransition(async () => {
      try {
        const returnTo = getReturnToUrl(pathname, searchParams);
        const result = await action(returnTo);
        if (result?.error) {
          addToast(result.error, "error");
          return;
        }
        if (result?.success) {
          addToast(result.success, "success");
        }
        if (hideOnSuccess) {
          setHidden(true);
        }
      } catch (error) {
        if (isRedirectError(error)) {
          if (hideOnSuccess) {
            setHidden(true);
          }
          throw error;
        }
        addToast("An unexpected error occurred. Please try again.", "error");
      }
    });
  }

  let buttonClass = "";
  if (variant === "primary") {
    buttonClass = "rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-light disabled:opacity-60";
  } else if (variant === "destructive") {
    buttonClass = "rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60";
  } else if (variant === "secondary") {
    buttonClass = "rounded-md border border-border bg-surface-muted px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface-muted-hover disabled:opacity-60 transition-colors";
  }

  return (
    <button
      type="button"
      onClick={handleAction}
      disabled={pending}
      className={`${buttonClass} ${className} inline-flex items-center justify-center gap-2`}
    >
      {pending && (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {pending ? (loadingText || children) : children}
    </button>
  );
}
