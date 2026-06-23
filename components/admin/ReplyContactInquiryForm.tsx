import { SubmitButton } from "@/components/shared/SubmitButton";
type ReplyContactInquiryFormProps = {
  inquiry: {
    name: string;
    email: string;
    phone: string;
    message: string;
    reply: string | null;
  };
  action: (formData: FormData) => Promise<void>;
};

export function ReplyContactInquiryForm({ inquiry, action }: ReplyContactInquiryFormProps) {
  const isReplied = Boolean(inquiry.reply);

  return (
    <form action={action} className="mx-auto max-w-2xl space-y-5">
      <div className="rounded-lg border border-border bg-background/50 p-4 text-sm">
        <p className="font-medium text-foreground">{inquiry.name}</p>
        <p className="mt-1 text-muted">
          {inquiry.email} · {inquiry.phone}
        </p>
        <p className="mt-3 whitespace-pre-wrap text-foreground">{inquiry.message}</p>
      </div>

      <div>
        <label htmlFor="reply" className="block text-sm font-medium text-foreground">
          {isReplied ? "Update reply" : "Reply to visitor"}
        </label>
        <textarea
          id="reply"
          name="reply"
          required
          minLength={10}
          maxLength={10000}
          rows={10}
          defaultValue={inquiry.reply ?? ""}
          placeholder="Write your reply here. This will be emailed to the visitor."
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        <p className="mt-1 text-xs text-muted">
          Minimum 10 characters. The visitor will receive this reply by email.
        </p>
      </div>

      <SubmitButton
        type="submit"
        className="min-h-11 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-light"
      >
        {isReplied ? "Update reply & resend email" : "Send reply"}
      </SubmitButton>
    </form>
  );
}
