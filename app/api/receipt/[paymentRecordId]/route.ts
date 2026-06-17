import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/admin";
import { getMonthlyFeePaise } from "@/lib/course-pricing";
import { getCourseById } from "@/lib/courses";
import {
  buildReceiptLineDescription,
  formatInvoiceNumber,
  generatePaymentReceiptPdf,
  getReceiptFilename,
} from "@/lib/payment-receipt";
import { prisma } from "@/lib/prisma";
import { withDbErrorHandling } from "@/lib/db-error";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentRecordId: string }> },
) {
  const { paymentRecordId } = await params;

  const record = await withDbErrorHandling(() => prisma.paymentRecord.findUnique({
      where: { id: paymentRecordId },
      include: {
        user: {
          select: { id: true, name: true, email: true, address: true, whatsapp: true },
        },
        submission: {
          select: { paymentMethod: true, upiTransactionId: true, label: true },
        },
      },
    }), "Database operation failed");

  if (!record) {
    return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  }

  const session = await auth();
  const isOwner = session?.user?.id === record.userId;
  const isAdmin = isAdminSession(session);

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const course = record.courseId ? await getCourseById(record.courseId) : null;
  const courseTitle = course?.title ?? "Darse Quran Academy";
  const filename = getReceiptFilename(courseTitle, paymentRecordId);

  const unitPricePaise = course
    ? Math.max(getMonthlyFeePaise(course), record.amountInrPaise)
    : record.amountInrPaise;
  const discountPercent =
    unitPricePaise > record.amountInrPaise
      ? Math.round(((unitPricePaise - record.amountInrPaise) / unitPricePaise) * 100)
      : 0;

  const lineDescription = buildReceiptLineDescription(
    courseTitle,
    record.description ?? record.submission?.label ?? null,
    course?.description ?? null,
  );

  const pdfBytes = await generatePaymentReceiptPdf({
    invoiceNumber: formatInvoiceNumber(paymentRecordId),
    studentName: record.user.name ?? "Student",
    studentAddress: record.user.address,
    studentPhone: record.user.whatsapp,
    studentEmail: record.user.email,
    courseTitle,
    lineDescription,
    quantity: 1,
    unitPricePaise,
    discountPercent,
    amountInrPaise: record.amountInrPaise,
    paidAt: record.paidAt,
    paymentMethod: record.submission?.paymentMethod ?? null,
    paymentNote: record.description ?? record.submission?.label ?? null,
    upiTransactionId: record.submission?.upiTransactionId ?? null,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
