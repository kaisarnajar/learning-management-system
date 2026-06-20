import { prisma } from "@/lib/prisma";

export type AcademySettingsData = {
  academyName: string;
  academyAddress: string;
  academyWebsite: string;
};

/**
 * Fetches the core academy settings from the database.
 * If they do not exist, it creates the default settings.
 */
export async function getAcademySettings(): Promise<AcademySettingsData> {
  let settings = await prisma.academySettings.findUnique({
    where: { id: "default" },
  });

  if (!settings) {
    settings = await prisma.academySettings.create({
      data: {
        id: "default",
        academyName: "Darse Quran Academy",
        academyAddress: "Treran Tangmarg, Baramulla J&K 193402",
        academyWebsite: "www.darsequranacademy.com",
      },
    });
  }

  return {
    academyName: settings.academyName,
    academyAddress: settings.academyAddress,
    academyWebsite: settings.academyWebsite,
  };
}
