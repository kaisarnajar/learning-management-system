import { prisma } from "@/utils/prisma";
import { savePaymentScreenshot } from "@/services/payment-upload";

export async function createCoursePaymentSubmission(params: {
  userId: string;
  courseId: string;
  paymentType: string;
  label: string;
  amountInrPaise: number;
  status: string;
  paymentMethod: string | null;
  upiTransactionId: string | null;
  screenshotFile: File | null;
}): Promise<{ error?: string; createdId?: string }> {
  if (params.upiTransactionId && params.paymentMethod !== "waiver" && params.upiTransactionId !== "FEE-WAIVER") {
    const duplicateUtrSubmission = await prisma.coursePaymentSubmission.findFirst({
      where: { upiTransactionId: params.upiTransactionId },
    });

    if (duplicateUtrSubmission) {
      return { error: "This transaction reference was already used. Contact support if this is a mistake." };
    }
  }

  const created = await prisma.coursePaymentSubmission.create({
    data: {
      userId: params.userId,
      courseId: params.courseId,
      paymentType: params.paymentType,
      label: params.label,
      amountInrPaise: params.amountInrPaise,
      status: params.status,
      paymentMethod: params.paymentMethod,
      upiTransactionId: params.upiTransactionId,
    },
  });

  await prisma.coursePaymentSubmission.update({
    where: { id: created.id },
    data: { paymentReference: created.id },
  });

  if (params.screenshotFile && params.screenshotFile.size > 0) {
    const paymentScreenshotPath = await savePaymentScreenshot(created.id, params.screenshotFile);
    await prisma.coursePaymentSubmission.update({
      where: { id: created.id },
      data: { paymentScreenshotPath },
    });
  }

  return { createdId: created.id };
}
