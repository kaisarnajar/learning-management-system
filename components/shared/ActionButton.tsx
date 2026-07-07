"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { Button } from "../ui/Button";

import { useToast } from "@/components/shared/ToastProvider";

export type ActionButtonVariant = "primary" | "destructive" | "secondary";

export function getReturnToUrl(pathname: string, searchParams: URLSearchParams) {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function ActionButton({
  action,
  children,
  loadingText,
  variant = "primary",
  hideOnSuccess = true,
  className = "",
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (returnTo: string) => Promise<{ error?: string } | void | any>;
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

  return (
    <Button
      type="button"
      onClick={handleAction}
      disabled={pending}
      variant={variant}
      size="sm"
      className={className}
      isLoading={pending}
    >
      {pending ? (loadingText || children) : children}
    </Button>
  );
}
