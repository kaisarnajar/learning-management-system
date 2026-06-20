import { ReactNode } from "react";

interface FormErrorProps {
  message?: string | null;
  children?: ReactNode;
  className?: string;
}

export function FormError({ message, children, className = "" }: FormErrorProps) {
  const content = message || children;
  
  if (!content) return null;

  return (
    <p 
      className={`rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text ${className}`} 
      role="alert"
    >
      {content}
    </p>
  );
}
