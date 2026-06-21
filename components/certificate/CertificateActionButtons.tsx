"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/shared/ActionButton";
import { generateCertificate } from "@/app/actions/certificates";
import { useToast } from "@/components/shared/ToastProvider";

interface CertificateActionButtonsProps {
  enrollmentId: string;
  certificateGeneratedAt: Date | null;
  isAdmin?: boolean;
  label?: string;
  courseTitle?: string;
}

export function CertificateActionButtons({
  enrollmentId,
  certificateGeneratedAt,
  isAdmin = false,
  label = "View Certificate",
  courseTitle,
}: CertificateActionButtonsProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<"APPRECIATION" | "COMPLETION">("APPRECIATION");
  const [grade, setGrade] = useState<number | "">("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && dialog && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const { addToast } = useToast();

  const handleGenerate = async () => {
    try {
      if (type === "COMPLETION" && (grade === "" || isNaN(grade as number))) {
        return { error: "Grade is required for a Certificate of Completion." };
      }
      const result = await generateCertificate(enrollmentId, type, grade as number);
      if (result && 'error' in result && result.error) {
         return { error: result.error as string };
      }
      setIsOpen(false);
      addToast("Certificate generated successfully.", "success");
      router.refresh();
    } catch (e: unknown) {
      console.error(e);
      return { error: e instanceof Error ? e.message : "Failed to generate certificate" };
    }
  };

  const btnClass = isAdmin
    ? "inline-flex min-h-9 items-center justify-center rounded-md border border-primary bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors disabled:opacity-60"
    : "mt-4 flex w-full min-h-11 items-center justify-center rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-light transition-colors disabled:opacity-60";

  if (certificateGeneratedAt) {
    return (
      <Link
        href={`/api/certificate/${enrollmentId}`}
        target="_blank"
        className={btnClass}
      >
        {label}
      </Link>
    );
  }

  if (!isAdmin) {
    return <span className="text-xs text-muted">Pending Generation</span>;
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)} className={btnClass}>
        Generate Certificate
      </button>

      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault();
          setIsOpen(false);
        }}
        className="backdrop:bg-black/50 backdrop:backdrop-blur-sm fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-md p-6 bg-surface rounded-xl shadow-xl border border-border open:animate-in open:fade-in-90 open:zoom-in-95 m-0 overflow-hidden text-left"
      >
        <h3 className="text-lg font-semibold text-foreground">Generate Certificate</h3>
        <p className="mt-2 text-sm text-muted">
          {courseTitle ? `For: ${courseTitle}` : "Fill out the details to generate the certificate."}
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Certificate Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "APPRECIATION" | "COMPLETION")}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="APPRECIATION">Certificate of Appreciation</option>
              <option value="COMPLETION">Certificate of Completion</option>
            </select>
          </div>

          {type === "COMPLETION" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Grade (out of 10)</label>
              <input
                type="number"
                min={0}
                max={10}
                value={grade}
                onChange={(e) => setGrade(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
        </div>
        
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted rounded-md transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <ActionButton
            action={handleGenerate}
            variant="primary"
          >
            Generate Certificate
          </ActionButton>
        </div>
      </dialog>
    </>
  );
}
