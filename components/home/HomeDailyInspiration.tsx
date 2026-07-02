import {
  dailyInspirationHomeTitle,
  type DailyInspirationRecord,
} from "@/lib/daily-inspiration";
import { Source_Serif_4 } from "next/font/google";
import { indoPakArabic } from "@/lib/fonts/indo-pak-arabic";
import { BookOpen } from "lucide-react";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600"] });

type HomeDailyInspirationProps = {
  inspiration: DailyInspirationRecord | null;
};

type CommentaryInfo = {
  tafsir: string;
  practice: string;
  tags: string[];
};

function getDailyInspirationCommentary(id: string, kind: string): CommentaryInfo {
  // Map specific seed data ids to match the screenshot or be contextually rich
  if (id === "seed-demo-inspiration-1" || id.includes("inspiration-1")) {
    return {
      tafsir: "Uncover the depths of traditional scholarship on the virtues of spiritual perseverance.",
      practice: "How to cultivate tranquility and resilience in the face of today's constant digital noise.",
      tags: ["SABR", "SHUKR", "TAWAKKUL", "FIKR", "ADAB"],
    };
  }
  
  if (kind === "QURAN") {
    return {
      tafsir: "Uncover the depths of traditional scholarship on this divine verse, exploring its context, linguistic beauty, and historical interpretations.",
      practice: "How to integrate this Qur'anic guidance into your modern daily routine to foster spiritual mindfulness.",
      tags: ["IMAN", "TAQWA", "SABR", "DHIKR"],
    };
  }

  return {
    tafsir: "Explore the prophetic wisdom and scholarly consensus regarding this teaching, focusing on practical implementation and character development.",
    practice: "How to live the Sunnah in everyday life, focusing on moral excellence, kindness, and personal responsibility.",
    tags: ["SUNNAH", "ADAB", "AKHLAQ", "ILM"],
  };
}

function RosetteIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <circle cx="50" cy="50" r="15" />
      <circle cx="50" cy="25" r="12" />
      <circle cx="50" cy="75" r="12" />
      <circle cx="25" cy="50" r="12" />
      <circle cx="75" cy="50" r="12" />
      <circle cx="32.3" cy="32.3" r="12" />
      <circle cx="67.7" cy="67.7" r="12" />
      <circle cx="32.3" cy="67.7" r="12" />
      <circle cx="67.7" cy="32.3" r="12" />
    </svg>
  );
}

export function HomeDailyInspiration({ inspiration }: HomeDailyInspirationProps) {
  if (!inspiration) return null;

  const commentary = getDailyInspirationCommentary(inspiration.id, inspiration.kind);

  return (
    <div className="w-full">
      {/* Top Green Section */}
      <section className="relative overflow-hidden bg-[#0b4f35] py-20 sm:py-24" aria-labelledby="daily-inspiration-heading">
        {/* Soft decorative glow */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-gold/15 blur-[100px]" aria-hidden="true"></div>
        <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 h-96 w-96 rounded-full bg-gold/10 blur-[100px]" aria-hidden="true"></div>

        {/* Gold top and bottom borders */}
        <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-gold/0 via-gold/40 to-gold/0" />
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-gold/0 via-gold/40 to-gold/0" />

        {/* Rosette Ornaments in Corners */}
        <div className="absolute top-12 left-12 text-[#136143] pointer-events-none select-none hidden md:block">
          <RosetteIcon className="w-24 h-24" />
        </div>
        <div className="absolute bottom-12 right-12 text-[#136143] pointer-events-none select-none hidden md:block">
          <RosetteIcon className="w-24 h-24" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6">
          <div className="flex flex-col items-center">
            {/* Title Header with Lines */}
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-[0.3em] text-[#cca72f] sm:text-sm">
              <div className="h-[1.5px] w-6 bg-[#cca72f]/40 sm:w-10"></div>
              <span>DAILY WISDOM</span>
              <div className="h-[1.5px] w-6 bg-[#cca72f]/40 sm:w-10"></div>
            </div>

            {/* Main Card with Double Border */}
            <div className="relative mt-10 w-full max-w-3xl mx-auto rounded-3xl border-2 border-gold/40 bg-[#06301f]/95 p-1.5 shadow-[0_25px_60px_rgba(0,0,0,0.65)] ring-1 ring-gold/10">
              <div className="border border-gold/20 rounded-[20px] px-6 py-12 sm:px-12 sm:py-16 md:px-16 md:py-20">
                
                {/* Badge Icon Overlap */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full border-2 border-gold bg-[#06301f] text-[#cca72f] flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.195-.561.986-.561 1.18 0l1.838 5.279a.5.5 0 00.477.347h5.539c.596 0 .843.769.362 1.129l-4.482 3.32a.5.5 0 00-.178.547l1.838 5.279c.196.56-.449 1.03-1.077.569l-4.482-3.32a.5.5 0 00-.58 0l-4.482 3.32c-.628.461-1.273-.01-1.077-.569l1.838-5.279a.5.5 0 00-.178-.547l-4.482-3.32c-.48-.36-.233-1.129.362-1.129h5.539a.5.5 0 00.477-.347L11.48 3.499z" />
                  </svg>
                </div>

                {/* Arabic Text */}
                <p
                  className={`${indoPakArabic.className} indo-pak-arabic text-center text-4xl leading-relaxed text-white drop-shadow-md sm:text-5xl md:text-6xl md:leading-[1.8]`}
                  dir="rtl"
                  lang="ar"
                >
                  {inspiration.arabicText}
                </p>

                {/* Small Rosette Divider */}
                <div className="flex justify-center items-center my-8">
                  <svg className="w-6 h-6 text-gold/60" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" />
                    <circle cx="12" cy="6" r="2" />
                    <circle cx="12" cy="18" r="2" />
                    <circle cx="6" cy="12" r="2" />
                    <circle cx="18" cy="12" r="2" />
                    <circle cx="7.76" cy="7.76" r="2.2" />
                    <circle cx="16.24" cy="16.24" r="2.2" />
                    <circle cx="7.76" cy="16.24" r="2.2" />
                    <circle cx="16.24" cy="7.76" r="2.2" />
                  </svg>
                </div>

                {/* English Translation */}
                <div className={`${sourceSerif.className} mx-auto max-w-2xl text-center text-lg leading-relaxed text-zinc-100 sm:text-xl md:text-2xl italic font-light`}>
                  &ldquo;{inspiration.englishTranslation}&rdquo;
                </div>

                {/* Reference */}
                {inspiration.reference && (
                  <footer className="mt-8 text-center text-xs font-bold tracking-[0.3em] text-[#cca72f] uppercase sm:text-sm">
                    {inspiration.reference}
                  </footer>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Dark Section (Commentary & Practice) */}
      <section className="bg-[#0b0b0b] py-16 sm:py-20 border-t border-zinc-900">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          
          {/* Two cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Card 1: Tafsir */}
            <div className="border border-zinc-800 bg-[#161616] p-8 rounded-2xl border-l-4 border-l-teal-400 flex flex-col justify-between transition-all duration-300 hover:border-zinc-700 hover:border-l-teal-400 hover:shadow-lg">
              <div>
                <div className="flex items-center justify-between">
                  <BookOpen className="w-6 h-6 text-teal-400" />
                  <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Tafsir</span>
                </div>
                <h3 className="mt-4 font-serif text-lg font-semibold text-zinc-100 sm:text-xl">
                  Classical Commentary
                </h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed font-light">
                  {commentary.tafsir}
                </p>
              </div>
            </div>

            {/* Card 2: Practice */}
            <div className="border border-zinc-800 bg-[#161616] p-8 rounded-2xl border-l-4 border-l-gold flex flex-col justify-between transition-all duration-300 hover:border-zinc-700 hover:border-l-gold hover:shadow-lg">
              <div>
                <div className="flex items-center justify-between">
                  {/* Lotus/Yoga Meditation Icon */}
                  <svg className="w-6 h-6 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="5" r="2" />
                    <path d="M12 7v7" />
                    <path d="M5 13c1.5-1 3-2 7-2s5.5 1 7 2" />
                    <path d="M4 19c2-1 4-2 8-2s6 1 8 2" strokeLinecap="round" />
                  </svg>
                  <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Practice</span>
                </div>
                <h3 className="mt-4 font-serif text-lg font-semibold text-zinc-100 sm:text-xl">
                  Modern Application
                </h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed font-light">
                  {commentary.practice}
                </p>
              </div>
            </div>

          </div>

          {/* Tag Pills */}
          <div className="flex flex-wrap justify-center items-center gap-3 mt-12">
            {commentary.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-gold/30 px-5 py-1.5 text-xs font-semibold tracking-widest text-gold/80 hover:bg-gold/5 transition-colors cursor-default uppercase"
              >
                {tag}
              </span>
            ))}
          </div>

        </div>
      </section>
    </div>
  );
}
