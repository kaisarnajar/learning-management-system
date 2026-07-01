"use client";

import { Download, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/site/PageHeader";

export function IdCardPreview() {
  const [isLoading, setIsLoading] = useState(true);
  const [iframeSrc, setIframeSrc] = useState("/api/id-card?inline=1#toolbar=0&navpanes=0&scrollbar=0");

  useEffect(() => {
    setIframeSrc(`/api/id-card?inline=1&t=${Date.now()}#toolbar=0&navpanes=0&scrollbar=0`);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Digital ID Card"
          description="Your official virtual student identification card."
        />
        
        <a
          href="/api/id-card"
          download="Student_ID_Card.pdf"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light shadow-sm"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Download PDF</span>
        </a>
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
          This is a preview of your official Student ID Card. You can download the high-quality PDF version using the button above to print it or keep it on your device.
        </p>

      </div>
    </div>
  );
}
