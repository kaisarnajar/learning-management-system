
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { SplitSectionTitle } from "@/components/site/SplitSectionTitle";

export function HomeAbout() {
  return (
    <section className="pattern-teal py-16 text-white sm:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <SplitSectionTitle
          muted="About"
          accent="Us"
          className="[&_.title-muted]:!text-white [&_.title-accent]:!text-gold-light"
        />
        <p className="mt-6 text-sm leading-relaxed text-white/90 sm:text-base">
          Darse-Quran is a non-profit Sunni Islamic media group based in South Asia, serving from Jammu
          and Kashmir to spread the teaching of Islam worldwide through sound scholarship and da&apos;wah.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-white/80 sm:text-base">
          Darse Quran Academy is our online platform for structured Quran and Islamic studies—with
          qualified teachers, classes are generally after Isha salah, and structured progress through each course.
        </p>
        <TrackedLink
          href="/about"
          eventName="Read More"
          pageName="/"
          className="btn-gold-outline mt-8 inline-flex border-white px-8 py-3 text-sm text-white hover:bg-surface hover:text-teal"
        >
          Read More
        </TrackedLink>
      </div>
    </section>
  );
}
