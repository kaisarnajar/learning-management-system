import { MetadataRoute } from "next";
import { BRAND_CONFIG } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_CONFIG.name,
    short_name: BRAND_CONFIG.shortName,
    description: BRAND_CONFIG.seo.defaultDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f766e", // Primary theme color (Emerald/Teal accent)
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
