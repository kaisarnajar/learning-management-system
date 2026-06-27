import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth-actions";
import { getFatwaQuestionById } from "@/lib/fatwa";
import { ActionToast } from "@/components/shared/ToastProvider";
import { submitTeacherFatwaAnswer } from "@/app/teacher/(portal)/fatwa/actions";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { inputClassName, labelClassName } from "@/lib/form";

export default async function TeacherFatwaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { session } = await requireTeacher();
  const { id } = await params;
  const query = await searchParams;
  const question = await getFatwaQuestionById(id);
  
  if (!question) notFound();

  // Determine if teacher is allowed to answer this
  const isAllowed = !question.answer || question.answeredById === session.user.id;
  if (!isAllowed) notFound();

  const answerAction = submitTeacherFatwaAnswer.bind(null, id);

  return (
    <div>
      <Link href="/teacher/fatwa" className="text-sm text-primary hover:underline">
        ← Back to Fatwa Q&A
      </Link>

      <h1 className="mt-4 font-serif text-2xl font-bold text-primary">
        {question.answer ? "Edit draft answer" : "Draft answer"}
      </h1>
      <p className="mt-1 text-sm text-muted">{question.title}</p>

      <ActionToast trigger={query.saved === "1"} paramName="saved" message="Draft saved and submitted for admin approval." variant="info" />

      {query.error && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text" role="alert">
          {decodeURIComponent(query.error)}
        </p>
      )}

      {question.answer && (
        <p className="mt-4 text-sm text-muted">
          Status:{" "}
          <span className={`font-semibold ${question.approvalStatus === "PENDING" ? "text-warning-text" : question.approvalStatus === "REJECTED" ? "text-destructive-text" : "text-success-text"}`}>
            {question.approvalStatus === "PENDING" ? "Pending Admin Approval" : question.approvalStatus === "REJECTED" ? "Rejected" : "Approved and Published"}
          </span>
        </p>
      )}

      <div className="mt-8">
        <form action={answerAction} className="mx-auto max-w-2xl space-y-5">
          <div className="rounded-lg border border-border bg-background/50 p-4 text-sm">
            <p className="font-medium text-foreground">{question.title}</p>
            <p className="mt-2 whitespace-pre-wrap text-muted">{question.question}</p>
            <p className="mt-3 text-xs text-muted">
              {question.category}
            </p>
          </div>

          <div>
            <label htmlFor="answer" className={labelClassName}>
              {question.answer ? "Update draft" : "Submit draft for review"}
            </label>
            <textarea
              id="answer"
              name="answer"
              required
              minLength={20}
              maxLength={10000}
              rows={12}
              defaultValue={question.answer ?? ""}
              placeholder="Write the scholarly answer here…"
              className={inputClassName}
              disabled={question.approvalStatus === "APPROVED"}
            />
            {question.approvalStatus === "APPROVED" ? (
              <p className="mt-1 text-xs text-success-text font-medium">This answer is approved and published. It can no longer be edited.</p>
            ) : (
              <p className="mt-1 text-xs text-muted">Minimum 20 characters. The admin will be notified to review it.</p>
            )}
          </div>

          {question.approvalStatus !== "APPROVED" && (
            <SubmitButton
              type="submit"
              className="min-h-11 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light"
            >
              {question.answer ? "Update draft" : "Submit draft"}
            </SubmitButton>
          )}
        </form>
      </div>
      
      {question.approvalStatus === "APPROVED" && (
        <p className="mt-6 text-sm text-muted">
          Public link:{" "}
          <Link href={`/fatwa/${question.id}`} className="text-primary hover:underline" target="_blank">
            /fatwa/{question.id}
          </Link>
        </p>
      )}
    </div>
  );
}
