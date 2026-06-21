import type { Metadata } from "next";
import Link from "next/link";
import { AskFatwaForm } from "@/components/fatwa/AskFatwaForm";
import { PageHeader } from "@/components/site/PageHeader";
import { Section } from "@/components/site/Section";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Ask a Question",
  description: "Submit your Islamic question to Darse Quran Academy scholars.",
};

export default async function FatwaAskPage() {
  const session = await auth();

  return (
    <Section>
      <PageHeader
        title="Ask a question"
        description="Submit a question on Islam, Quran, Hadith, Fiqh, Tajweed, Seerah, or related topics. We will email you when it is answered."
      />

      <p className="mt-4 text-center text-sm text-muted">
        <Link href="/fatwa" className="font-medium text-primary hover:underline">
          ← Browse answered questions
        </Link>
      </p>

      <div className="mx-auto mt-8 max-w-xl">
        <AskFatwaForm
          defaultName={session?.user?.name ?? ""}
          defaultEmail={session?.user?.email ?? ""}
          isLoggedIn={Boolean(session?.user)}
        />
      </div>
    </Section>
  );
}
