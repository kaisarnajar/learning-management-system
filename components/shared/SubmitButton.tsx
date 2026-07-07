"use client";

import { useFormStatus } from "react-dom";

import { Button } from "../ui/Button";

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
    <Button
      type="submit"
      disabled={isLoading || disabled}
      className={className}
      isLoading={isLoading}
      {...props}
    >
      {isLoading ? loadingText || children : children}
    </Button>
  );
}
