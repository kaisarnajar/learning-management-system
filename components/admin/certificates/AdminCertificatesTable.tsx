"use client";

import Link from "next/link";
import { AdminCertificateEntry } from "@/services/certificates-admin";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { deleteCertificate } from "@/app/actions/certificates";
import { useToast } from "@/components/shared/ToastProvider";
import { usePathname, useSearchParams } from "next/navigation";
import { getReturnToUrl } from "@/components/shared/ActionButton";

type AdminCertificatesTableProps = {
  certificates: AdminCertificateEntry[];
  emptyMessage: string;
};

export function AdminCertificatesTable({
  certificates,
  emptyMessage,
}: AdminCertificatesTableProps) {
  const { addToast } = useToast();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = getReturnToUrl(pathname, searchParams);

  if (certificates.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">{emptyMessage}</p>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-ui-1000 text-left text-sm">
        <thead className="border-b border-border bg-background/50 text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Certificate Number</th>
            <th className="px-4 py-3 font-medium">Student Name</th>
            <th className="px-4 py-3 font-medium">Course</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Grade</th>
            <th className="px-4 py-3 font-medium">Date Generated</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {certificates.map((cert) => (
            <tr key={cert.id} className="transition-colors hover:bg-accent-muted/50">
              <td className="px-4 py-3 font-mono text-foreground">
                {cert.certificateNumber}
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">
                  {cert.user.name || "N/A"}
                </div>
                <div className="text-xs text-muted">{cert.user.email}</div>
              </td>
              <td className="px-4 py-3 text-foreground">{cert.course.title}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {cert.certificateType === "appreciation" ? "Appreciation" : "Completion"}
                </span>
              </td>
              <td className="px-4 py-3 text-foreground">
                {cert.certificateGrade !== null ? cert.certificateGrade : "N/A"}
              </td>
              <td className="px-4 py-3 text-muted">
                {cert.certificateGeneratedAt.toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/admin/certificates/${cert.id}`}
                    className="inline-flex min-h-8 items-center justify-center rounded-md border border-primary bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                  >
                    View
                  </Link>
                  <DeleteActionButton
                    action={async () => {
                      const result = await deleteCertificate(cert.id);
                      if (result?.error) {
                        addToast(result.error, "error");
                        return result;
                      }
                      addToast("Certificate deleted successfully.", "success");
                    }}
                    title="Delete"
                    itemName="certificate"
                    onSuccessRedirect={returnTo}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
