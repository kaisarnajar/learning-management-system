import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting backfill of registration numbers for existing students...");

  const usersToBackfill = await prisma.user.findMany({
    where: {
      name: { notIn: [""] },
      fatherName: { notIn: [""] },
      dateOfBirth: { not: null },
      occupation: { not: null },
      address: { notIn: [""] },
      whatsapp: { notIn: [""] },
      email: { notIn: [""] },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(`Found ${usersToBackfill.length} users with complete profiles.`);

  // Reset all existing registration numbers so we can generate them cleanly
  await prisma.user.updateMany({
    data: { registrationNumber: null }
  });

  const { generateNextRegistrationNumber } = await import("../lib/registration");

  // Backfill each user
  for (const user of usersToBackfill) {
    const registrationYear = user.createdAt.getFullYear();
    const regNum = await generateNextRegistrationNumber(registrationYear);

    await prisma.user.update({
      where: { id: user.id },
      data: { registrationNumber: regNum },
    });

    console.log(`Assigned ${regNum} to user ${user.email}`);
  }

  console.log("Backfill complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
