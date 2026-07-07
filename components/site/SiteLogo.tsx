import Image from "next/image";
import Link from "next/link";
import { BRAND_CONFIG } from "@/config/brand";

/** Intrinsic dimensions of public/assets/logo.png after optimization */
const LOGO_WIDTH = 480;
const LOGO_HEIGHT = 480;

type SiteLogoProps = {
  href?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export function SiteLogo({
  href = "/",
  className = "",
  imageClassName = "",
  priority = false,
}: SiteLogoProps) {
  const image = (
    <Image
      src={BRAND_CONFIG.assets.logoUrl}
      alt={`${BRAND_CONFIG.name} — Come towards Quran, come towards success`}
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      className={[
        "h-10 w-auto sm:h-11",
        imageClassName,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      priority={priority}
      sizes="(max-width: 640px) 200px, 240px"
    />
  );

  if (!href) return image;

  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center rounded-lg transition-opacity hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {image}
    </Link>
  );
}
