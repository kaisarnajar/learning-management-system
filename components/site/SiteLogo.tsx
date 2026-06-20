import Image from "next/image";
import Link from "next/link";

/** Intrinsic dimensions of public/assets/logo.png after optimization */
const LOGO_WIDTH = 480;
const LOGO_HEIGHT = 480;

type SiteLogoProps = {
  href?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  /** Use on white/light surfaces — teal badge + blend for contrast */
  onLight?: boolean;
};

export function SiteLogo({
  href = "/",
  className = "",
  imageClassName = "",
  priority = false,
  onLight = true,
}: SiteLogoProps) {
  const image = (
    <Image
      src="/assets/logo.png"
      alt="Darse Quran Academy — Come towards Quran, come towards success"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      className={[
        "h-10 w-auto sm:h-11",
        onLight ? "mix-blend-lighten" : "",
        imageClassName,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      priority={priority}
      sizes="(max-width: 640px) 200px, 240px"
    />
  );

  const wrapped = onLight ? (
    <span
      className="inline-flex items-center rounded-lg bg-gradient-to-br from-teal to-teal-dark px-2.5 py-1.5 shadow-md ring-1 ring-teal-dark/40"
      aria-hidden
    >
      {image}
    </span>
  ) : (
    image
  );

  if (!href) return wrapped;

  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center rounded-lg transition-opacity hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {wrapped}
    </Link>
  );
}
