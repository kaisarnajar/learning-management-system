"use client";

import { useFormStatus } from "react-dom";

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loadingText?: React.ReactNode;
  isSubmitting?: boolean;
}

export function SubmitButton({
  children,
  loadingText,
  isSubmitting,
  disabled,
  className = "",
  ...props
}: SubmitButtonProps) {
  const { pending, data } = useFormStatus();
  let isLoading = pending || isSubmitting;

  if (pending && props.name && props.value !== undefined) {
    isLoading = data?.get(props.name) === props.value;
  }

  return (
    <button
      type="submit"
      disabled={isLoading || disabled}
      className={`${className} flex items-center justify-center gap-2`}
      {...props}
    >
      {isLoading && (
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
      {isLoading ? loadingText || children : children}
    </button>
  );
}
