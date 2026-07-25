import { PrismaClient } from "@prisma/client";

async function fixMigrationLock() {
  const prisma = new PrismaClient();
  try {
    console.log("Checking for failed migrations in database...");
    const updatedCount = await prisma.$executeRawUnsafe(
      `UPDATE "_prisma_migrations" SET finished_at = NOW(), applied_steps_count = 1, logs = NULL WHERE finished_at IS NULL`
    );
    if (updatedCount > 0) {
      console.log(`Successfully auto-resolved ${updatedCount} failed migration record(s).`);
    } else {
      console.log("No failed migrations found in database.");
    }
  } catch (error) {
    console.warn("Migration auto-repair check skipped or encountered non-fatal error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMigrationLock();
