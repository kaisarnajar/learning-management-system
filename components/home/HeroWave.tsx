export function HeroWave() {
  return (
    <div className="relative -mt-1 h-12 bg-[var(--gold)] sm:h-16" aria-hidden>
      <svg
        className="absolute bottom-0 left-0 w-full text-text-offwhite"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        fill="currentColor"
      >
        <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,45 L1440,80 L0,80 Z" />
      </svg>
    </div>
  );
}
