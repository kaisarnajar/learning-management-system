import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/site/PageHeader";
import { Section } from "@/components/site/Section";
import { getAnsweredFatwaById } from "@/services/fatwa";

type FatwaDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: FatwaDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const fatwa = await getAnsweredFatwaById(id);
  if (!fatwa) return { title: "Question not found" };
  return {
    title: fatwa.title,
    description: fatwa.question.slice(0, 160),
  };
}

export default async function FatwaDetailPage({ params }: FatwaDetailPageProps) {
  const { id } = await params;
  const fatwa = await getAnsweredFatwaById(id);
  if (!fatwa || !fatwa.answer) notFound();

  const answeredDate = fatwa.answeredAt
    ? fatwa.answeredAt.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <Section>
      <p className="text-sm text-muted">
        <Link href="/fatwa" className="font-medium text-primary hover:underline">
          ← Fatwa Section
        </Link>
      </p>

      <article className="mx-auto mt-6 max-w-3xl">
        <PageHeader title={fatwa.title} description={`Category: ${fatwa.category}`} />

        <div className="mt-8 space-y-8">
          <section className="card-elevated p-6 sm:p-8">
            <h2 className="font-serif text-lg font-semibold text-primary">Question</h2>
            <p className="mt-1 text-xs text-muted">
              {[
                fatwa.askerName !== "Anonymous" ? `Asked by ${fatwa.askerName}` : null,
                answeredDate ? `Answered ${answeredDate}` : null
              ].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{fatwa.question}</p>
          </section>

          <section className="card-elevated border-l-4 border-l-accent p-6 sm:p-8">
            <h2 className="font-serif text-lg font-semibold text-primary">Answer</h2>
            <div
              className="blog-content mt-4 text-base leading-relaxed text-foreground"
              dangerouslySetInnerHTML={{ __html: fatwa.answer }}
            />
          </section>
        </div>

        <p className="mt-8 text-center">
          <Link
            href="/fatwa/ask"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-light"
          >
            Ask another question
          </Link>
        </p>
      </article>
    </Section>
  );
}
