import { MetadataRoute } from "next";
import { BRAND_CONFIG } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  const isStaging = process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "development";

  return {
    name: isStaging ? `${BRAND_CONFIG.name} (Staging)` : BRAND_CONFIG.name,
    short_name: isStaging ? `${BRAND_CONFIG.shortName} Stg` : BRAND_CONFIG.shortName,
    description: BRAND_CONFIG.seo.defaultDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1e293b",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: isStaging ? "/icon-512-staging.png" : "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
