import {
  dailyInspirationHomeTitle,
  type DailyInspirationRecord,
} from "@/lib/daily-inspiration";

type HomeDailyInspirationProps = {
  inspiration: DailyInspirationRecord | null;
};

export function HomeDailyInspiration({ inspiration }: HomeDailyInspirationProps) {
  if (!inspiration) return null;

  const title = dailyInspirationHomeTitle(inspiration.kind);

  return (
    <section className="relative overflow-hidden bg-teal-dark py-16 sm:py-20 lg:py-24" aria-labelledby="daily-inspiration-heading">
      {/* Pattern background layer */}
      <div className="absolute inset-0 pattern-teal opacity-40 mix-blend-overlay" aria-hidden="true"></div>
      
      {/* Top subtle glow */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-gold/20 blur-[100px]" aria-hidden="true"></div>
      
      {/* Bottom subtle glow */}
      <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 h-96 w-96 rounded-full bg-gold/10 blur-[100px]" aria-hidden="true"></div>

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        {/* Decorative Quote Icon */}
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold-light shadow-lg shadow-gold/5">
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
        </div>
        
        <p
          id="daily-inspiration-heading"
          className="text-sm font-bold uppercase tracking-[0.2em] text-gold-light"
        >
          {title}
        </p>

        <blockquote className="mt-8">
          <p
            className="indo-pak-arabic text-3xl leading-loose text-white drop-shadow-lg sm:text-4xl md:leading-[2.5]"
            dir="rtl"
            lang="ar"
          >
            {inspiration.arabicText}
          </p>
          <div className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-zinc-200 sm:text-lg">
            {inspiration.englishTranslation}
          </div>
          {inspiration.reference && (
            <footer className="mt-8 flex items-center justify-center gap-4 text-sm font-semibold tracking-wide text-gold-light">
              <span className="h-px w-12 bg-gradient-to-r from-transparent to-gold/50"></span>
              <span>{inspiration.reference}</span>
              <span className="h-px w-12 bg-gradient-to-l from-transparent to-gold/50"></span>
            </footer>
          )}
        </blockquote>
      </div>
    </section>
  );
}
