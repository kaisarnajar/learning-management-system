import { BRAND_CONFIG } from "@/config/brand";

export type SocialLinksSettingsData = {
  contactEmail: string;
  whatsappNumber: string;
  whatsappDefaultMessage: string;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
};

export const SOCIAL_LINKS_CONFIG: SocialLinksSettingsData = {
  contactEmail: BRAND_CONFIG.contact.email,
  whatsappNumber: BRAND_CONFIG.contact.whatsapp,
  whatsappDefaultMessage: BRAND_CONFIG.contact.whatsappDefaultMessage,
  facebookUrl: BRAND_CONFIG.social.facebook || "",
  instagramUrl: BRAND_CONFIG.social.instagram || "",
  youtubeUrl: BRAND_CONFIG.social.youtube || "",
};

export function normalizeWhatsAppNumber(input: string): string {
  return input.replace(/\D/g, "");
}

export function formatWhatsAppForDisplay(digits: string | null | undefined): string {
  if (!digits) return "";
  const d = normalizeWhatsAppNumber(digits);
  if (d.length === 12 && d.startsWith("91")) {
    return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
  }
  return d ? `+${d}` : "";
}

export function buildWhatsAppHref(number: string, message?: string): string {
  const digits = normalizeWhatsAppNumber(number);
  if (!digits) return "#";
  const text = message?.trim();
  if (text) {
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }
  return `https://wa.me/${digits}`;
}

export async function getSocialLinksSettings(): Promise<SocialLinksSettingsData> {
  return SOCIAL_LINKS_CONFIG;
}

export type SocialNetworkLink = {
  href: string;
  label: "Facebook" | "Instagram" | "YouTube";
};

export function getConfiguredSocialNetworkLinks(
  settings: SocialLinksSettingsData,
): SocialNetworkLink[] {
  const links: SocialNetworkLink[] = [];
  if (settings.facebookUrl) {
    links.push({ href: settings.facebookUrl, label: "Facebook" });
  }
  if (settings.instagramUrl) {
    links.push({ href: settings.instagramUrl, label: "Instagram" });
  }
  if (settings.youtubeUrl) {
    links.push({ href: settings.youtubeUrl, label: "YouTube" });
  }
  return links;
}
