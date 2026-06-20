import { ReactNode } from "react";

interface EmptyStateProps {
  message?: string;
  children?: ReactNode;
  className?: string;
}

export function EmptyState({ message, children, className = "" }: EmptyStateProps) {
  const content = message || children;
  
  if (!content) return null;

  return (
    <div className={`px-4 py-8 text-center text-sm text-muted ${className}`}>
      {content}
    </div>
  );
}
