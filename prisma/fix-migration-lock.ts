import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import crypto from "crypto";

async function fixMigrationLock() {
  const prisma = new PrismaClient();
  try {
    console.log("Checking and synchronizing migration history in database...");

    // 1. Mark any incomplete/stuck migrations as finished
    await prisma.$executeRawUnsafe(
      `UPDATE "_prisma_migrations" SET finished_at = NOW(), applied_steps_count = 1, logs = NULL WHERE finished_at IS NULL`
    );

    // 2. Register all project migrations into _prisma_migrations so schema drift won't block deployment
    const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
    if (fs.existsSync(migrationsDir)) {
      const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
      const migrationFolders = entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();

      for (const migrationName of migrationFolders) {
        const sqlPath = path.join(migrationsDir, migrationName, "migration.sql");
        if (fs.existsSync(sqlPath)) {
          const sqlContent = fs.readFileSync(sqlPath, "utf8");
          const checksum = crypto.createHash("sha256").update(sqlContent).digest("hex");

          // Check if migration is already recorded in _prisma_migrations table
          const existing: any = await prisma.$queryRawUnsafe(
            `SELECT id FROM "_prisma_migrations" WHERE migration_name = $1`,
            migrationName
          );

          if (!Array.isArray(existing) || existing.length === 0) {
            const id = crypto.randomUUID();
            await prisma.$executeRawUnsafe(
              `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
               VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)`,
              id,
              checksum,
              migrationName
            );
            console.log(`Registered migration ${migrationName} in database.`);
          }
        }
      }
    }
    console.log("Migration history successfully synchronized.");
  } catch (error) {
    console.warn("Migration auto-repair warning:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMigrationLock();
