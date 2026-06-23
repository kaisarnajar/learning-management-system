import { prisma } from "@/lib/prisma";
import { withDbErrorHandling } from "@/lib/db-error";

export const SOCIAL_LINKS_SETTINGS_ID = "default";

export type SocialLinksSettingsData = {
  contactEmail: string;
  whatsappNumber: string;
  whatsappDefaultMessage: string;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
};

function defaultSettings(): SocialLinksSettingsData {
  return {
    contactEmail: "darsequraann@gmail.com",
    whatsappNumber: "919622966911",
    whatsappDefaultMessage:
      "Assalamu Alaikum, I would like to know more about Darse Quran Academy.",
    facebookUrl: "https://facebook.com",
    instagramUrl: "https://instagram.com",
    youtubeUrl: "https://youtube.com",
  };
}

export function normalizeWhatsAppNumber(input: string): string {
  return input.replace(/\D/g, "");
}

export function formatWhatsAppForDisplay(digits: string): string {
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

function rowToSettings(row: {
  contactEmail: string;
  whatsappNumber: string;
  whatsappDefaultMessage: string;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
}): SocialLinksSettingsData {
  const defaults = defaultSettings();
  return {
    contactEmail: row.contactEmail.trim() || defaults.contactEmail,
    whatsappNumber: normalizeWhatsAppNumber(row.whatsappNumber) || defaults.whatsappNumber,
    whatsappDefaultMessage: row.whatsappDefaultMessage.trim() || defaults.whatsappDefaultMessage,
    facebookUrl: row.facebookUrl.trim(),
    instagramUrl: row.instagramUrl.trim(),
    youtubeUrl: row.youtubeUrl.trim(),
  };
}

export async function getSocialLinksSettings(): Promise<SocialLinksSettingsData> {
  const row = await withDbErrorHandling(() => prisma.socialLinksSettings.findUnique({
      where: { id: SOCIAL_LINKS_SETTINGS_ID },
    }), "Database operation failed");

  if (!row) {
    return defaultSettings();
  }

  return rowToSettings(row);
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
