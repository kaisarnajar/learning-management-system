import { MetadataRoute } from "next";
import { BRAND_CONFIG } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_CONFIG.name,
    short_name: BRAND_CONFIG.shortName,
    description: BRAND_CONFIG.seo.defaultDescription,
    start_url: "/",
    scope: "/",
    id: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0f766e",
    categories: ["education", "lifestyle"],
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
