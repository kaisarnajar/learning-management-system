import { MetadataRoute } from "next";
import { BRAND_CONFIG } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  const isStaging = process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "development";
  const suffix = isStaging ? "-staging" : "";

  return {
    name: isStaging ? `${BRAND_CONFIG.name} (Staging)` : BRAND_CONFIG.name,
    short_name: isStaging ? `${BRAND_CONFIG.shortName} Stg` : BRAND_CONFIG.shortName,
    description: BRAND_CONFIG.seo.defaultDescription,
    start_url: "/",
    display: "standalone",
    background_color: BRAND_CONFIG.colors.background,
    theme_color: BRAND_CONFIG.colors.theme,
    // PNGs only, at the sizes Android asks for (scripts/generate-app-icons.mjs).
    // No favicon here: listed as "sizes: any", Chrome could pick it for the
    // home-screen icon and scale its small image up, which made the icon blurry.
    // The maskable pair keeps the round seal inside Android's icon mask.
    icons: [
      { src: `/icons/app/icon-192${suffix}.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `/icons/app/icon-512${suffix}.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `/icons/app/icon-maskable-192${suffix}.png`, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: `/icons/app/icon-maskable-512${suffix}.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
