import crypto from "crypto";
import { prisma } from "@/utils/prisma";

export async function generateVerificationToken(email: string) {
  const token = crypto.randomUUID();
  // 24 hours from now
  const expires = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);

  const existingToken = await prisma.verificationToken.findFirst({
    where: { identifier: email },
  });

  if (existingToken) {
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: existingToken.identifier,
          token: existingToken.token,
        },
      },
    });
  }

  const verificationToken = await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });

  return verificationToken;
}
