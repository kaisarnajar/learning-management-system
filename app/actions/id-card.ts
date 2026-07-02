"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateIdCardPdf } from "@/lib/id-card-html";
import { sendIdCardEmail } from "@/lib/email";

export async function sendIdCardToEmailAction(targetUserId?: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "DEVELOPER")) {
      return { error: "Unauthorized. Admin access required." };
    }

    if (!targetUserId) {
      return { error: "targetUserId is required." };
    }

    const idToFetch = targetUserId;

    const user = await prisma.user.findUnique({
      where: { id: idToFetch },
    });

    if (!user) {
      return { error: "User not found." };
    }
    
    if (!user.email) {
      return { error: "No email address found for this user." };
    }

    const pdfBuffer = await generateIdCardPdf(user);
    const filename = `ID_Card_${user.name?.replace(/\s+/g, '_') || "Student"}.pdf`;

    const emailResult = await sendIdCardEmail({
      to: user.email,
      studentName: user.name || "Student",
      pdfBuffer: Buffer.from(pdfBuffer),
      pdfFilename: filename,
    });

    if (emailResult.sent) {
      return { success: true };
    } else {
      return { error: emailResult.error || "Failed to send email." };
    }
  } catch (error) {
    console.error("sendIdCardToEmailAction error:", error);
    return { error: "An unexpected error occurred while generating or sending the ID card." };
  }
}
