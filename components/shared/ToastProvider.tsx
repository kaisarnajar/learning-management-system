"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export type ToastVariant = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextType {
  addToast: (message: string, variant?: ToastVariant) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, variant }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 w-80 max-w-[calc(100vw-2rem)] p-4 bg-surface rounded-xl shadow-xl border border-border animate-in slide-in-from-bottom-5 fade-in-90 ${
              toast.variant === "success"
                ? "border-l-4 border-l-green-500"
                : toast.variant === "error"
                ? "border-l-4 border-l-red-500"
                : toast.variant === "warning"
                ? "border-l-4 border-l-yellow-500"
                : "border-l-4 border-l-blue-500"
            }`}
          >
            {toast.variant === "success" && (
              <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toast.variant === "error" && (
              <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toast.variant === "warning" && (
              <svg className="w-5 h-5 text-yellow-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {toast.variant === "info" && (
              <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <p className="text-sm font-medium text-foreground">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-auto text-muted hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

/**
 * ActionToast is a headless component designed to be dropped into Server Components.
 * It listens to the `trigger` prop (typically driven by a URL param). When true, it
 * fires the toast and immediately removes the query parameter from the URL.
 */
export function ActionToast({
  trigger,
  paramName,
  message,
  variant = "success",
}: {
  trigger: boolean;
  paramName?: string;
  message: string;
  variant?: ToastVariant;
}) {
  const { addToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (trigger) {
      addToast(message, variant);

      // Clean up the URL if a paramName is provided
      if (paramName && searchParams.has(paramName)) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete(paramName);
        const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.replace(newUrl, { scroll: false });
      }
    }
  }, [trigger, paramName, message, variant, addToast, pathname, router, searchParams]);

  return null;
}
