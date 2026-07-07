"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/shared/SubmitButton";
import type { FatwaQuestion } from "@prisma/client";
import { HOMEPAGE_FEATURED_FATWA_MAX } from "@/services/fatwa";
import { labelClassName } from "@/utils/form";
import { RichTextEditor } from "@/components/shared/RichTextEditor";

type AnswerFatwaFormProps = {
  question: FatwaQuestion;
  featuredCount: number;
  action: (formData: FormData) => Promise<void>;
  rejectAction?: (formData: FormData) => Promise<void>;
};

export function AnswerFatwaForm({ question, featuredCount, action, rejectAction }: AnswerFatwaFormProps) {
  const isAnswered = Boolean(question.answer);
  const isPending = question.approvalStatus === "PENDING";
  const [answer, setAnswer] = useState(question.answer ?? "");

  return (
    <form action={action} className="mx-auto max-w-2xl space-y-5">
      <div className="rounded-lg border border-border bg-background/50 p-4 text-sm">
        <p className="font-medium text-foreground">{question.title}</p>
        <p className="mt-2 whitespace-pre-wrap text-muted">{question.question}</p>
        <p className="mt-3 text-xs text-muted">
          {question.category}
          {question.askerName !== "Anonymous" && ` · ${question.askerName} · ${question.askerEmail === "anonymous@darsequranacademy.org" ? "N/A" : question.askerEmail}`}
        </p>
      </div>

      <div>
        <label htmlFor="answer" className={labelClassName}>
          {isAnswered ? "Update answer" : "Publish answer"}
        </label>
        
        {/* Hidden input to pass the editor content back to the Server Action */}
        <input type="hidden" name="answer" value={answer} />
        
        <RichTextEditor
          value={answer}
          onChange={setAnswer}
          placeholder="Write the scholarly answer here…"
          readOnly={isPending}
        />
        
        {isPending ? (
          <p className="mt-1 text-xs text-muted">You are reviewing a submitted answer. It cannot be edited directly.</p>
        ) : (
          <p className="mt-1 text-xs text-muted">Minimum 20 characters. The asker will be emailed when you save.</p>
        )}
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background/40 px-4 py-4 text-sm text-foreground">
        <input
          type="checkbox"
          name="featuredOnHomepage"
          defaultChecked={question.featuredOnHomepage}
          className="mt-1 rounded border-border"
        />
        <span>
          <span className="font-medium">Show on homepage</span>
          <span className="mt-0.5 block text-muted">
            Featured in the Fatwa section when this answer is published (up to {HOMEPAGE_FEATURED_FATWA_MAX};{" "}
            {featuredCount}/{HOMEPAGE_FEATURED_FATWA_MAX} slots used). All answered questions still appear on the
            Fatwa page.
          </span>
        </span>
      </label>

      <div className="flex gap-3">
        <SubmitButton
          type="submit"
          name="submit_action"
          value="approve"
          className="min-h-11 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light"
        >
          {isPending ? "Approve & Publish" : isAnswered ? "Update answer" : "Publish answer"}
        </SubmitButton>
        {isPending && rejectAction && (
          <SubmitButton
            type="submit"
            name="submit_action"
            value="reject"
            formAction={rejectAction}
            className="min-h-11 rounded-md bg-destructive-bg px-5 py-2 text-sm font-semibold text-destructive-text hover:bg-destructive-bg/80"
          >
            Reject
          </SubmitButton>
        )}
      </div>
    </form>
  );
}
