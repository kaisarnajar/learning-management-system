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
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-gold/20 blur-[100px]" aria-hidden="true"></div>
      
      {/* Bottom subtle glow */}
      <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 h-96 w-96 rounded-full bg-gold/10 blur-[100px]" aria-hidden="true"></div>

      {/* Gold top and bottom borders */}
      <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-[#cca72f]/0 via-[#cca72f] to-[#cca72f]/0 opacity-50" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#cca72f]/0 via-[#cca72f] to-[#cca72f]/0 opacity-50" />

      <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6">
        <div className="motion-safe:animate-fade-up flex flex-col items-center">
          
          {/* Decorative Quote Icon */}
          <div className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold shadow-[0_0_15px_rgba(204,167,47,0.2)]">
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
          </div>
          
          <p
            id="daily-inspiration-heading"
            className="text-sm font-bold uppercase tracking-[0.25em] text-gold"
          >
            {title}
          </p>

          <blockquote className="relative mt-12 w-full">
            {/* Soft decorative background for the quote area */}
            <div className="absolute inset-0 rounded-3xl bg-white/5 blur-2xl"></div>
            
            <div className="relative">
              <p
                className="indo-pak-arabic text-3xl leading-loose text-white drop-shadow-md sm:text-4xl md:text-5xl md:leading-[2.5]"
                dir="rtl"
                lang="ar"
              >
                {inspiration.arabicText}
              </p>
              
              <div className="mx-auto mt-10 h-px w-24 bg-gradient-to-r from-transparent via-gold/50 to-transparent"></div>

              <div className={`${sourceSerif.className} mx-auto mt-10 max-w-3xl text-lg leading-relaxed text-zinc-200 sm:text-xl md:text-2xl`}>
                {inspiration.englishTranslation}
              </div>
              
              {inspiration.reference && (
                <footer className="mt-10 flex items-center justify-center gap-4 text-sm font-semibold tracking-widest text-gold/80 uppercase">
                  <span>{inspiration.reference}</span>
                </footer>
              )}
            </div>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
