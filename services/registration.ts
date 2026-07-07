import { prisma } from "@/utils/prisma";

export async function generateNextRegistrationNumber(registrationYear: number): Promise<string> {
  const prefix = `DQA${registrationYear}-`;

  // We find the user with the highest registration number matching the prefix
  // Since it's padded, lexicographical sort order matches numerical order.
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

  // Pad to 5 digits, e.g. 00001
  const paddedSequence = String(nextSequenceNumber).padStart(5, "0");
  return `${prefix}${paddedSequence}`;
}
