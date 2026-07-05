import {
  type DailyInspirationRecord,
} from "@/lib/daily-inspiration";
import { Source_Serif_4 } from "next/font/google";
import { indoPakArabic } from "@/lib/fonts/indo-pak-arabic";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600"] });

type HomeDailyInspirationProps = {
  inspiration: DailyInspirationRecord | null;
};

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

  return (
    <section className="relative overflow-hidden bg-[#0b4f35] py-20 sm:py-24" aria-labelledby="daily-inspiration-heading">
      {/* Soft decorative glow */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-gold/15 blur-[100px]" aria-hidden="true"></div>
      <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 h-96 w-96 rounded-full bg-gold/10 blur-[100px]" aria-hidden="true"></div>

      {/* Gold top and bottom borders */}
      <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-gold/0 via-gold/40 to-gold/0" />
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-gold/0 via-gold/40 to-gold/0" />

      {/* Rosette Ornaments in Corners */}
      <div className="absolute top-12 left-12 text-[#cca72f] pointer-events-none select-none hidden md:block">
        <RosetteIcon className="w-24 h-24" />
      </div>
      <div className="absolute bottom-12 right-12 text-[#cca72f] pointer-events-none select-none hidden md:block">
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
                className={`${indoPakArabic.className} indo-pak-arabic !text-center text-3xl leading-relaxed text-white drop-shadow-md sm:text-4xl md:text-5xl lg:text-6xl md:leading-[1.8]`}
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
  );
}
