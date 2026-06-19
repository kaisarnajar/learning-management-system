import Link from "next/link";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { bismillahArabic, bismillahEnglish } from "@/content/bismillah";
import { indoPakArabic } from "@/lib/fonts/indo-pak-arabic";

export function HomeHero() {
  return (
    <section className="bg-gradient-to-br from-stone-900 via-teal-900 to-stone-800 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 sm:px-6 sm:py-16 md:flex-row md:items-center md:justify-between md:gap-10">
        <div className="min-w-0 max-w-xl shrink-0">
          <h1 className="text-3xl font-bold text-gold-light sm:text-4xl">Darse Quran Academy</h1>
          <p className="mt-3 text-base leading-relaxed text-white/90 sm:text-lg">
            Learn Quran, Tajweed, and Islamic studies online with qualified teachers—wherever you are.
          </p>
          <TrackedLink href="/courses" eventName="View Courses" pageName="/" className="btn-gold-outline mt-6 inline-flex px-6 py-2.5 text-sm">
            View Courses
          </TrackedLink>
        </div>

        <div className="min-w-0 md:max-w-md md:text-right">
          <p
            lang="ar"
            dir="rtl"
            className={`${indoPakArabic.className} indo-pak-arabic text-xl leading-relaxed text-white sm:text-2xl md:text-[1.65rem]`}
          >
            {bismillahArabic}
          </p>
          <p className="mt-2 text-sm italic text-white/80 sm:text-base">{bismillahEnglish}</p>
        </div>
      </div>
    </section>
  );
}
