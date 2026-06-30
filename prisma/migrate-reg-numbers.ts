import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const prefix = "DQA2018-";

async function main() {
  console.log("Starting backfill of registration numbers for existing students...");

  // Find all users who don't have a registration number
  // but have completed their profile (checking the same fields as isProfileComplete)
  const usersToBackfill = await prisma.user.findMany({
    where: {
      registrationNumber: null,
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

  console.log(`Found ${usersToBackfill.length} users with complete profiles missing a registration number.`);

  if (usersToBackfill.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  // Find the current highest sequence number
  const lastUser = await prisma.user.findFirst({
    where: {
      registrationNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      registrationNumber: "desc",
    },
    select: {
      registrationNumber: true,
    },
  });

  let nextSequenceNumber = 1;
  if (lastUser && lastUser.registrationNumber) {
    const sequencePart = lastUser.registrationNumber.substring(prefix.length);
    const parsedSequence = parseInt(sequencePart, 10);
    if (!isNaN(parsedSequence)) {
      nextSequenceNumber = parsedSequence + 1;
    }
  }

  // Backfill each user
  for (const user of usersToBackfill) {
    const paddedSequence = String(nextSequenceNumber).padStart(5, "0");
    const regNum = `${prefix}${paddedSequence}`;

    await prisma.user.update({
      where: { id: user.id },
      data: { registrationNumber: regNum },
    });

    console.log(`Assigned ${regNum} to user ${user.email}`);
    nextSequenceNumber++;
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
