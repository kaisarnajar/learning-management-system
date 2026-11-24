import { createPrismaClient } from "../utils/prisma-client";
import { seedBootstrap } from "./seed-bootstrap";

/**
 * Default seed (`prisma db seed` / `npm run db:seed`).
 *
 * Runs ONLY the bootstrap seed (teachers, courses, library items, the
 * payment-settings row, shipping slabs). It creates missing rows and never
 * updates or deletes existing ones, so it is safe to re-run against a live
 * database. The destructive demo seed (which also adds coupons and homepage
 * testimonials) lives in seed-demo.ts and must be invoked explicitly.
 */
const prisma = createPrismaClient();

async function main() {
  await seedBootstrap(prisma);
  console.log("Bootstrap seed complete (no rows were deleted).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
