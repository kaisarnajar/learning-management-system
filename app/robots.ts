import { MetadataRoute } from "next";
import { BRAND_CONFIG } from "@/config/brand";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = BRAND_CONFIG.websiteUrl.replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/profile/",
          "/api/",
          "/auth/",
          "/teacher/",
          "/developer/",
          "/receipt/",
          "/announcements/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
