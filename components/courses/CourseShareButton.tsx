"use client";

import { useEffect, useRef, useState } from "react";
import { Share2, Link as LinkIcon, QrCode, Download, X } from "lucide-react";
import QRCode from "qrcode";

interface CourseShareButtonProps {
  courseTitle: string;
}

export function CourseShareButton({ courseTitle }: CourseShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const url = typeof window !== "undefined" ? window.location.href : "";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && dialog && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      setIsOpen(false);
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, []);

  useEffect(() => {
    if (isOpen && url && !qrCodeUrl) {
      QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      })
        .then((dataUrl) => setQrCodeUrl(dataUrl))
        .catch((err) => console.error("Error generating QR Code:", err));
    }
  }, [isOpen, url, qrCodeUrl]);

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: courseTitle,
          url,
        });
        setIsOpen(false);
      } catch (err) {
        console.error("Error sharing natively:", err);
      }
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    alert("Link copied to clipboard!");
  };

  const handleDownloadQr = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = `QR-Course-${courseTitle.replace(/\s+/g, "-")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-muted transition-colors hover:bg-gold hover:text-white"
        aria-label="Share Course"
        title="Share Course"
      >
        <Share2 className="h-4 w-4" />
      </button>

      <dialog
        ref={dialogRef}
        className="backdrop:bg-black/50 backdrop:backdrop-blur-sm fixed top-1/2 left-1/2 m-0 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-border bg-surface p-0 text-left shadow-xl open:animate-in open:fade-in-90 open:zoom-in-95"
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-lg font-semibold text-foreground">Share Course</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-full p-1 text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col gap-3">
            {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
              <button
                onClick={handleNativeShare}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-gold px-4 py-2.5 font-medium text-white transition-colors hover:bg-gold/90"
              >
                <Share2 className="h-4 w-4" />
                Share via...
              </button>
            )}

            <button
              onClick={handleCopyLink}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-medium text-foreground transition-colors hover:bg-surface-muted"
            >
              <LinkIcon className="h-4 w-4" />
              Copy Link
            </button>
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-border"></div>
            <span className="mx-4 flex-shrink-0 text-xs uppercase tracking-wider text-muted">Or scan QR code</span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          <div className="flex flex-col items-center gap-4">
            {qrCodeUrl ? (
              <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCodeUrl} alt="Course QR Code" className="h-48 w-48 object-contain" />
              </div>
            ) : (
              <div className="flex h-48 w-48 items-center justify-center rounded-xl border border-border bg-surface-muted">
                <span className="text-sm text-muted">Generating...</span>
              </div>
            )}

            <button
              onClick={handleDownloadQr}
              disabled={!qrCodeUrl}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-surface-muted px-4 py-2.5 font-medium text-foreground transition-colors hover:bg-border disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Download QR Code
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
