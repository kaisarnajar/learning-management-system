import Link from "next/link";

export function DownloadReceiptButton({
  paymentRecordId,
  label = "View receipt",
}: {
  paymentRecordId: string;
  label?: string;
}) {
  return (
    <Link
      href={`/api/receipt/${paymentRecordId}`}
      target="_blank"
      className="inline-flex min-h-9 items-center justify-center rounded-md border border-primary bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors disabled:opacity-60"
    >
      {label}
    </Link>
  );
}
