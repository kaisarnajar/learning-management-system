import Link from "next/link";

export function DownloadCertificateButton({
  enrollmentId,
}: {
  enrollmentId: string;
  courseTitle: string;
}) {
  return (
    <Link
      href={`/api/certificate/${enrollmentId}`}
      target="_blank"
      className="mt-4 flex min-h-11 w-full items-center justify-center rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:opacity-90"
    >
      View certificate
    </Link>
  );
}
