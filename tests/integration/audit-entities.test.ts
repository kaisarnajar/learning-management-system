import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/utils/prisma";
import { getAuditEntities } from "@/services/audit";
import { resetDb, SKIP_WITHOUT_DB } from "../helpers/db";

describe.skipIf(SKIP_WITHOUT_DB)("audit-log entity filter", () => {
  beforeEach(resetDb);

  it("lists each entity once, in order", async () => {
    for (const entity of ["User", "Expense", "User", "Coupon", "Expense"]) {
      await prisma.auditLog.create({ data: { action: "delete", entity, entityId: "x" } });
    }
    expect(await getAuditEntities()).toEqual(["Coupon", "Expense", "User"]);
  });
});
