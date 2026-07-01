import {
  dailyInspirationHomeTitle,
  type DailyInspirationRecord,
} from "@/lib/daily-inspiration";
import { Source_Serif_4 } from "next/font/google";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600"] });

type HomeDailyInspirationProps = {
  inspiration: DailyInspirationRecord | null;
};

export function HomeDailyInspiration({ inspiration }: HomeDailyInspirationProps) {
  if (!inspiration) return null;

  const title = dailyInspirationHomeTitle(inspiration.kind);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#003527] via-teal-900 to-[#002117] py-20 sm:py-24" aria-labelledby="daily-inspiration-heading">
      {/* Pattern background layer */}
      <div className="pattern-islamic absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" aria-hidden="true"></div>
      
      {/* Top subtle glow */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-[#cca72f]/10 blur-[100px]" aria-hidden="true"></div>
      
      {/* Bottom subtle glow */}
      <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 h-96 w-96 rounded-full bg-[#cca72f]/5 blur-[100px]" aria-hidden="true"></div>

      {/* Gold top and bottom borders */}
      <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-[#cca72f]/0 via-[#cca72f] to-[#cca72f]/0 opacity-50" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#cca72f]/0 via-[#cca72f] to-[#cca72f]/0 opacity-50" />

      <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6">
        <div className="motion-safe:animate-fade-up flex flex-col items-center">
          
          {/* Decorative Islamic Geometric Symbol / Badge */}
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-[#cca72f]/40 bg-[#cca72f]/10 text-[#cca72f] shadow-[0_0_15px_rgba(204,167,47,0.15)]">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          
          <h2
            id="daily-inspiration-heading"
            className="text-xs font-bold uppercase tracking-[0.3em] text-[#cca72f]"
          >
            {title}
          </h2>

          <div className="relative mt-10 w-full max-w-4xl mx-auto rounded-2xl border border-[#cca72f]/20 bg-black/20 p-8 sm:p-12 md:p-16 backdrop-blur-sm shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
            {/* Corner decorations */}
            <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-[#cca72f]/40"></div>
            <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-[#cca72f]/40"></div>
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-[#cca72f]/40"></div>
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-[#cca72f]/40"></div>

            <div className="relative space-y-8">
              <p
                className="indo-pak-arabic text-3xl leading-[2] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] sm:text-4xl md:text-5xl md:leading-[2.2]"
                dir="rtl"
                lang="ar"
              >
                {inspiration.arabicText}
              </p>
              
              <div className="flex justify-center items-center gap-4 py-2">
                <span className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#cca72f]/40"></span>
                <span className="text-[#cca72f] opacity-80 text-lg">✦</span>
                <span className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#cca72f]/40"></span>
              </div>

              <div className={`${sourceSerif.className} mx-auto max-w-3xl text-lg leading-relaxed text-zinc-200 sm:text-xl md:text-2xl font-light italic`}>
                "{inspiration.englishTranslation}"
              </div>
              
              {inspiration.reference && (
                <footer className="pt-4 flex items-center justify-center gap-3">
                  <span className="h-[1px] w-6 bg-[#cca72f]/25"></span>
                  <span className="text-xs font-semibold tracking-[0.2em] text-[#cca72f]/90 uppercase">
                    {inspiration.reference}
                  </span>
                  <span className="h-[1px] w-6 bg-[#cca72f]/25"></span>
                </footer>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
