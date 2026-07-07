"use client";

import { Mail, Loader2, Download } from "lucide-react";
import { useState, useTransition, useEffect } from "react";
import { PageHeader } from "@/components/site/PageHeader";
import { useToast } from "@/components/shared/ToastProvider";
import { sendReceiptToEmailAction } from "@/app/actions/receipts";
import { BRAND_CONFIG } from "@/config/brand";

export function ReceiptPreview({ paymentRecordId }: { paymentRecordId: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();
  const [timestamp] = useState(() => Date.now());

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 6000); // 6s safety timeout
    return () => clearTimeout(timer);
  }, []);

  const iframeSrc = `/api/receipt/${paymentRecordId}?inline=1&t=${timestamp}#toolbar=0&navpanes=0&scrollbar=0`;

  const handleSendEmail = () => {
    startTransition(async () => {
      const result = await sendReceiptToEmailAction(paymentRecordId);
      if (result.error) {
        addToast(result.error, "error");
      } else {
        addToast("Receipt sent successfully. Please check student's Inbox or Spam/Junk folder.", "success");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Payment Receipt"
          description={`Official payment receipt issued by ${BRAND_CONFIG.name}.`}
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

      <div className="relative flex min-h-ui-600 w-full flex-col items-center justify-center rounded-2xl border border-border bg-surface shadow-sm overflow-hidden p-4 md:p-8">
        
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm font-medium text-muted">Generating Receipt PDF...</p>
          </div>
        )}

        {/* Receipt aspect ratio is A4 portrait (~0.707) */}
        <div className="relative w-full max-w-ui-850 aspect-[0.707] bg-white rounded-xl overflow-hidden shadow-md ring-1 ring-border/50">
          <iframe
            src={iframeSrc}
            className="w-full h-full border-none"
            onLoad={() => setIsLoading(false)}
            title="Payment Receipt Preview"
          />
        </div>
        
        <p className="mt-6 text-sm text-muted text-center max-w-lg">
          This is a preview of the official Payment Receipt. You can email the high-quality PDF version directly to the student using the button above.
        </p>

      </div>
    </div>
  );
}
