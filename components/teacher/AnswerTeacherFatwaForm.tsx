"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/shared/SubmitButton";
import type { FatwaQuestion } from "@prisma/client";
import { labelClassName } from "@/utils/form";
import { RichTextEditor } from "@/components/shared/RichTextEditor";

type AnswerTeacherFatwaFormProps = {
  question: FatwaQuestion;
  action: (formData: FormData) => Promise<void>;
};

export function AnswerTeacherFatwaForm({ question, action }: AnswerTeacherFatwaFormProps) {
  const [answer, setAnswer] = useState(question.answer ?? "");
  const isDisabled =
    (question.approvalStatus === "APPROVED" && Boolean(question.answer)) ||
    question.approvalStatus === "PENDING";

  return (
    <form action={action} className="mx-auto max-w-2xl space-y-5">
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
        
        {/* Hidden input to pass the editor content back to the Server Action */}
        <input type="hidden" name="answer" value={answer} />

        <RichTextEditor
          value={answer}
          onChange={setAnswer}
          placeholder="Write the scholarly answer here…"
          readOnly={isDisabled}
        />
        
        {question.approvalStatus === "APPROVED" && Boolean(question.answer) ? (
          <p className="mt-1 text-xs text-success-text font-medium">This answer is approved and published. It can no longer be edited.</p>
        ) : question.approvalStatus === "PENDING" ? (
          <p className="mt-1 text-xs text-warning-text font-medium">This draft is pending review by the admin. You cannot edit it unless it is rejected.</p>
        ) : (
          <p className="mt-1 text-xs text-muted">Minimum 20 characters. The admin will be notified to review it.</p>
        )}
      </div>

      {!isDisabled && (
        <SubmitButton
          type="submit"
          className="min-h-11 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light"
        >
          {question.answer ? "Update draft" : "Submit draft"}
        </SubmitButton>
      )}
    </form>
  );
}
