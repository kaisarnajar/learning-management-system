import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteContactInquiryForm, replyToContactInquiry } from "@/app/admin/contact-inquiries/actions";
import { DeleteForm } from "@/components/admin/DeleteForm";
import { ReplyContactInquiryForm } from "@/components/admin/ReplyContactInquiryForm";
import { getContactInquiryById } from "@/lib/contact-inquiries";

export default async function AdminContactInquiryReplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string; email?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const inquiry = await getContactInquiryById(id);
  if (!inquiry) notFound();

  const replyAction = replyToContactInquiry.bind(null, id);
  const deleteAction = deleteContactInquiryForm.bind(null, id);

  return (
    <div>
      <Link href={`/admin/contact-inquiries/${id}`} className="text-sm text-primary hover:underline">
        ← Back to inquiry
      </Link>

      <h1 className="mt-4 font-serif text-2xl font-bold text-primary">
        {inquiry.reply ? "Edit reply" : "Reply to inquiry"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        From {inquiry.name} · {inquiry.email}
      </p>

      {query.saved === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">
          Reply saved.
          {query.email === "failed"
            ? " The notification email could not be sent — check SMTP settings in your environment."
            : query.email === "skipped"
              ? " SMTP is not configured, so no email was sent."
              : " The visitor has been notified by email."}
        </p>
      )}

      {query.error && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text" role="alert">
          {decodeURIComponent(query.error)}
        </p>
      )}

      {inquiry.repliedAt && (
        <p className="mt-4 text-sm text-muted">
          {inquiry.reply ? "Replied" : "Last updated"}{" "}
          {inquiry.repliedAt.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {inquiry.repliedBy?.name ? ` by ${inquiry.repliedBy.name}` : ""}
        </p>
      )}

      <div className="mt-8">
        <ReplyContactInquiryForm inquiry={inquiry} action={replyAction} />
      </div>

      <DeleteForm action={deleteAction} label="Delete inquiry" />
    </div>
  );
}
