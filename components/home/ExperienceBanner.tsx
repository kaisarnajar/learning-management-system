import { Source_Serif_4 } from "next/font/google";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["600", "700"] });

export function ExperienceBanner() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#b38b22] via-[#d4a017] to-[#b38b22] py-12 text-center shadow-inset-soft">
      {/* Decorative overlays */}
      <div className="absolute inset-0 bg-white/10 mix-blend-overlay"></div>
      <div className="pattern-islamic absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
      
      <div className="relative mx-auto flex max-w-4xl flex-col items-center justify-center px-4 sm:flex-row sm:gap-6 sm:px-6">
        <div className="motion-safe:animate-fade-up flex items-center justify-center gap-4 sm:gap-6">
          <div className="hidden h-[1px] w-12 bg-white/40 sm:block"></div>
          
          <div className="flex items-center gap-4">
            <svg className="h-8 w-8 text-white/90 drop-shadow-md sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            
            <h2 className={`${sourceSerif.className} text-3xl font-bold tracking-wide text-white drop-shadow-md sm:text-4xl md:text-5xl`}>
              5+ Years <span className="font-medium text-white/90 text-2xl sm:text-3xl md:text-4xl align-middle">of Experience</span>
            </h2>
          </div>
          
          <div className="hidden h-[1px] w-12 bg-white/40 sm:block"></div>
        </div>
      </div>
    </section>
  );
}
