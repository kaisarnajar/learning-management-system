import { SubmitButton } from "@/components/shared/SubmitButton";
import type { FatwaQuestion } from "@prisma/client";
import { HOMEPAGE_FEATURED_FATWA_MAX } from "@/lib/fatwa";
import { inputClassName, labelClassName } from "@/lib/form";

type AnswerFatwaFormProps = {
  question: FatwaQuestion;
  featuredCount: number;
  action: (formData: FormData) => Promise<void>;
};

export function AnswerFatwaForm({ question, featuredCount, action }: AnswerFatwaFormProps) {
  const isAnswered = Boolean(question.answer);

  return (
    <form action={action} className="mx-auto max-w-2xl space-y-5">
      <div className="rounded-lg border border-border bg-background/50 p-4 text-sm">
        <p className="font-medium text-foreground">{question.title}</p>
        <p className="mt-2 whitespace-pre-wrap text-muted">{question.question}</p>
        <p className="mt-3 text-xs text-muted">
          {question.category}
          {question.askerName !== "Anonymous" && ` · ${question.askerName} · ${question.askerEmail}`}
        </p>
      </div>

      <div>
        <label htmlFor="answer" className={labelClassName}>
          {isAnswered ? "Update answer" : "Publish answer"}
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
        />
        <p className="mt-1 text-xs text-muted">Minimum 20 characters. The asker will be emailed when you save.</p>
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

      <SubmitButton
        type="submit"
        className="min-h-11 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light"
      >
        {isAnswered ? "Update answer" : "Publish answer"}
      </SubmitButton>
    </form>
  );
}
