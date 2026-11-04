import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/utils/prisma";
import { generateNextRegistrationNumber } from "@/services/registration";
import { BRAND_CONFIG } from "@/config/brand";
import { createUser, resetDb, SKIP_WITHOUT_DB } from "../helpers/db";

const prefix = (year: number) => `${BRAND_CONFIG.registrationPrefix}${year}-`;

describe.skipIf(SKIP_WITHOUT_DB)("registration number allocation", () => {
  beforeEach(resetDb);

  it("starts a year at 00001 and counts up", async () => {
    expect(await generateNextRegistrationNumber(2031)).toBe(`${prefix(2031)}00001`);
    expect(await generateNextRegistrationNumber(2031)).toBe(`${prefix(2031)}00002`);
  });

  it("seeds a year's counter from the highest number already issued", async () => {
    const user = await createUser();
    await prisma.user.update({ where: { id: user.id }, data: { registrationNumber: `${prefix(2032)}00041` } });

    expect(await generateNextRegistrationNumber(2032)).toBe(`${prefix(2032)}00042`);
  });

  it("hands ten concurrent callers ten distinct numbers", async () => {
    const numbers = await Promise.all(Array.from({ length: 10 }, () => generateNextRegistrationNumber(2033)));

    expect(new Set(numbers).size).toBe(10);
  });
});
