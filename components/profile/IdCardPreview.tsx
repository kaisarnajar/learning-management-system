"use client";

import { Mail, Loader2, Download } from "lucide-react";
import { useState, useTransition } from "react";
import { PageHeader } from "@/components/site/PageHeader";
import { useToast } from "@/components/shared/ToastProvider";
import { sendIdCardToEmailAction } from "@/app/actions/id-card";

export function IdCardPreview({ userId }: { userId?: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();
  const [timestamp] = useState(() => Date.now());

  const iframeSrc = `/api/id-card?inline=1${userId ? `&userId=${userId}` : ""}&t=${timestamp}#toolbar=0&navpanes=0&scrollbar=0`;

  const handleSendEmail = () => {
    startTransition(async () => {
      const result = await sendIdCardToEmailAction(userId);
      if (result.error) {
        addToast(result.error, "error");
      } else {
        addToast("ID Card sent successfully. Please check your Inbox or Spam/Junk folder.", "success");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Digital ID Card"
          description="Your official virtual student identification card."
        />
        
        <div className="flex items-center gap-3">
          <a
            href={iframeSrc.replace('inline=1', 'inline=0').split('#')[0]}
            download
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
          </a>
          <button
            onClick={handleSendEmail}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            <span className="hidden sm:inline">{isPending ? "Sending..." : "Send via Email"}</span>
          </button>
        </div>
      </div>

      <div className="relative flex min-h-[500px] w-full flex-col items-center justify-center rounded-2xl border border-border bg-surface shadow-sm overflow-hidden p-4 md:p-8">
        
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm font-medium text-muted">Generating your ID card...</p>
          </div>
        )}

        {/* The aspect ratio for CR80 is ~1.58. 
            We'll constrain max-width so it looks good on desktop and fits on mobile. */}
        <div className="relative w-full max-w-[856px] aspect-[1.58] bg-white rounded-xl overflow-hidden shadow-md ring-1 ring-border/50">
          <iframe
            src={iframeSrc}
            className="w-full h-full border-none"
            onLoad={() => setIsLoading(false)}
            title="Student ID Card Preview"
          />
        </div>
        
        <p className="mt-6 text-sm text-muted text-center max-w-lg">
          This is a preview of your official Student ID Card. You can send the high-quality PDF version to your registered email address using the button above.
        </p>

      </div>
    </div>
  );
}
