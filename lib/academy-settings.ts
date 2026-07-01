export type AcademySettingsData = {
  academyName: string;
  academyAddress: string;
  academyWebsite: string;
};

export const ACADEMY_CONFIG: AcademySettingsData = {
  academyName: "Darse Quran Academy",
  academyAddress: "Treran Tangmarg, Baramulla J&K 193402",
  academyWebsite: "www.darsequranacademy.com",
};

export async function getAcademySettings(): Promise<AcademySettingsData> {
  return ACADEMY_CONFIG;
}
