import { PrismaClient } from "@prisma/client";
import { seedBootstrap } from "./seed-bootstrap";

/**
 * Default seed (`prisma db seed` / `npm run db:seed`).
 *
 * Runs ONLY the idempotent bootstrap upserts (teachers, courses, library
 * items, homepage testimonials, payment-settings row, shipping slabs). It
 * never deletes anything and is safe to re-run. The destructive demo seed
 * lives in seed-demo.ts and must be invoked explicitly.
 */
const prisma = new PrismaClient();

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
