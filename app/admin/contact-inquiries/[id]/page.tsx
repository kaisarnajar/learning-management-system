import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteContactInquiryForm } from "@/app/admin/contact-inquiries/actions";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { getContactInquiryById } from "@/services/contact-inquiries";

function statusLabel(reply: string | null) {
  return reply ? "Replied" : "Pending";
}

function statusClass(reply: string | null) {
  return reply ? "bg-success-bg text-success-text" : "bg-warning-bg text-warning-text";
}

export default async function AdminContactInquiryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const inquiry = await getContactInquiryById(id);
  if (!inquiry) notFound();

  const deleteAction = deleteContactInquiryForm.bind(null, id);

  return (
    <div>
      <Link href="/admin/contact-inquiries" className="text-sm text-primary hover:underline">
        ← Back to contact inquiries
      </Link>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">Contact inquiry</h1>
          <p className="mt-1 text-sm text-muted">{inquiry.email}</p>
        </div>
        <Link
          href={`/admin/contact-inquiries/${id}/reply`}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent-muted/50"
        >
          {inquiry.reply ? "Edit" : "Reply"}
        </Link>
      </div>

      {query.error && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text" role="alert">
          {decodeURIComponent(query.error)}
        </p>
      )}

      <dl className="mt-6 grid max-w-2xl gap-3 text-sm">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Name</dt>
          <dd className="text-muted">{inquiry.name}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Email</dt>
          <dd className="break-all text-muted">{inquiry.email}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Phone</dt>
          <dd className="text-muted">{inquiry.phone}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Status</dt>
          <dd>
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(inquiry.reply)}`}
            >
              {statusLabel(inquiry.reply)}
            </span>
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Message</dt>
          <dd className="whitespace-pre-wrap text-muted">{inquiry.message}</dd>
        </div>
        {inquiry.reply && (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-foreground sm:w-28">Reply</dt>
            <dd className="whitespace-pre-wrap text-muted">{inquiry.reply}</dd>
          </div>
        )}
        {inquiry.repliedAt && (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-foreground sm:w-28">Replied</dt>
            <dd className="text-muted">
              {inquiry.repliedAt.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {inquiry.repliedBy?.name ? ` by ${inquiry.repliedBy.name}` : ""}
            </dd>
          </div>
        )}
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Submitted</dt>
          <dd className="text-muted">
            {inquiry.createdAt.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </dd>
        </div>
      </dl>

      <DeleteActionButton action={deleteAction} itemName="inquiry" />
    </div>
  );
}
