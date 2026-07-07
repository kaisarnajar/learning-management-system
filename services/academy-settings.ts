import { BRAND_CONFIG } from "@/config/brand";

export type AcademySettingsData = {
  academyName: string;
  academyAddress: string;
  academyWebsite: string;
};

export const ACADEMY_CONFIG: AcademySettingsData = {
  academyName: BRAND_CONFIG.name,
  academyAddress: BRAND_CONFIG.contact.address,
  academyWebsite: BRAND_CONFIG.websiteUrl.replace("https://", "").replace("http://", ""),
};

export async function getAcademySettings(): Promise<AcademySettingsData> {
  return ACADEMY_CONFIG;
}
