import { TrackedLink } from "@/components/analytics/TrackedLink";
import { FatwaCard } from "@/components/fatwa/FatwaCard";
import { SplitSectionTitle } from "@/components/site/SplitSectionTitle";
import { getFeaturedHomepageFatwas } from "@/lib/fatwa";

export async function HomeFatwa() {
  const fatwas = await getFeaturedHomepageFatwas();

  return (
    <section className="bg-teal/[0.06] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <SplitSectionTitle muted="Fatwa" accent="Section" />
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
            Browse answered questions on Islam, Quran, Hadith, Fiqh, and more—or submit your own question
            and receive an email when our scholars publish a reply.
          </p>
        </div>

        {fatwas.length > 0 && (
          <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {fatwas.map((fatwa) => (
              <li key={fatwa.id}>
                <FatwaCard fatwa={fatwa} />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <TrackedLink href="/fatwa" eventName="Read Fatwas" pageName="/" className="btn-gold-solid inline-flex px-8 py-3 text-sm">
            Read Fatwas
          </TrackedLink>
          <TrackedLink href="/fatwa/ask" eventName="Ask Question" pageName="/" className="btn-gold-outline inline-flex px-8 py-3 text-sm">
            Ask Question
          </TrackedLink>
        </div>
      </div>
    </section>
  );
}
