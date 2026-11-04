/**
 * Links Teacher rows to their User account through the new Teacher.userId
 * column (migration 20261103001400). Until now a teacher was matched to an
 * account only by email at sign-in time.
 *
 * Usage:
 *   npx tsx scripts/backfill-teacher-user-links.ts            # dry run
 *   npx tsx scripts/backfill-teacher-user-links.ts --apply    # write after snapshotting
 *
 * A teacher is linked only when exactly one non-deleted User has the same
 * (case-insensitive) email. Teachers without an email, without a matching
 * account, or whose account is already linked to another teacher are listed
 * and left alone. Idempotent: rows with userId already set are skipped.
 */
import { PrismaClient } from "@prisma/client";
import { isApplyMode, printMode, writeSnapshot } from "./lib/dry-run";

const prisma = new PrismaClient();

async function main() {
  const apply = isApplyMode();
  printMode("backfill-teacher-user-links", apply);

  const teachers = await prisma.teacher.findMany({
    where: { userId: null },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const links: Array<{ teacherId: string; name: string; userId: string; email: string }> = [];
  const skipped: Array<{ teacherId: string; name: string; reason: string }> = [];

  for (const teacher of teachers) {
    const email = teacher.email?.trim().toLowerCase();
    if (!email) {
      skipped.push({ teacherId: teacher.id, name: teacher.name, reason: "no email on the teacher profile" });
      continue;
    }
    const users = await prisma.user.findMany({
      where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
      select: { id: true, email: true, teacherProfile: { select: { id: true } } },
    });
    if (users.length === 0) {
      skipped.push({ teacherId: teacher.id, name: teacher.name, reason: `no account with email ${email}` });
      continue;
    }
    if (users.length > 1) {
      skipped.push({ teacherId: teacher.id, name: teacher.name, reason: `${users.length} accounts match ${email}` });
      continue;
    }
    const user = users[0];
    if (user.teacherProfile && user.teacherProfile.id !== teacher.id) {
      skipped.push({ teacherId: teacher.id, name: teacher.name, reason: `account already linked to teacher ${user.teacherProfile.id}` });
      continue;
    }
    links.push({ teacherId: teacher.id, name: teacher.name, userId: user.id, email: user.email });
  }

  console.log(`Teachers without a user link: ${teachers.length}`);
  console.log(`Will link: ${links.length}`);
  for (const link of links) console.log(`  ${link.name} (${link.teacherId}) -> user ${link.userId} <${link.email}>`);
  console.log(`Skipped: ${skipped.length}`);
  for (const row of skipped) console.log(`  ${row.name} (${row.teacherId}): ${row.reason}`);

  if (!apply || links.length === 0) {
    if (links.length === 0) console.log("Nothing to do.");
    return;
  }

  const snapshot = writeSnapshot("backfill-teacher-user-links", links);
  console.log(`Snapshot written to ${snapshot}`);

  let written = 0;
  for (const link of links) {
    const result = await prisma.teacher.updateMany({
      where: { id: link.teacherId, userId: null },
      data: { userId: link.userId },
    });
    written += result.count;
  }
  console.log(`Linked ${written} teacher(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
