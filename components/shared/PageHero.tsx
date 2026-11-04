import type { ReactNode } from "react";
import { Source_Serif_4 } from "next/font/google";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["600", "700"] });

/** Dark-green banner at the top of the public pages: title, gold rule, description and optional actions. */
export function PageHero({
  title,
  description,
  tall = false,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Slightly taller banner without the extra `sm` padding (About, Contact). */
  tall?: boolean;
  children?: ReactNode;
}) {
  return (
    <section
      className={`relative overflow-hidden bg-gradient-to-br from-[#003527] via-teal-900 to-[#002117] px-4 ${
        tall ? "py-24 sm:px-6" : "py-20 sm:px-6 sm:py-24"
      } lg:px-8`}
    >
      <div className="pattern-islamic absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" />
      <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-[#cca72f]/0 via-[#cca72f] to-[#cca72f]/0 opacity-50"></div>
      <div className="mx-auto max-w-4xl text-center">
        <div className="motion-safe:animate-fade-up">
          <h1 className={`${sourceSerif.className} text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl`}>
            {title}
          </h1>
          <div className="mx-auto mt-6 h-1 w-24 rounded-full bg-brand-gold-alt"></div>
          {description && (
            <p className="mt-8 text-lg leading-relaxed text-white/90 sm:text-xl">{description}</p>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}
