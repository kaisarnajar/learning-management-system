import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MonthlyPaymentForm } from "@/components/payment/MonthlyPaymentForm";
import { PaymentDetailsPanel } from "@/components/payment/PaymentDetailsPanel";
import { requireUser } from "@/lib/auth-actions";
import { getMonthlyFeePaise } from "@/lib/course-pricing";
import { formatPrice, getCourseById } from "@/lib/courses";
import { prisma } from "@/lib/prisma";
import { isUpiConfigured } from "@/lib/upi";
import { withDbErrorHandling } from "@/lib/db-error";

export default async function PayMonthlyFeePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await requireUser();
  const { courseId } = await params;

  const course = await getCourseById(courseId);
  if (!course) notFound();

  const enrollment = await withDbErrorHandling(() => prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: session.user.id, courseId } },
    }), "Database operation failed");

  if (!enrollment || (enrollment.status !== "active" && enrollment.status !== "completed")) {
    redirect("/profile/courses");
  }

  if (!(await isUpiConfigured())) {
    return (
      <div>
        <p className="rounded-md bg-warning-bg px-4 py-3 text-sm text-warning-text">
          Online payments are not configured yet. Please contact the academy.
        </p>
      </div>
    );
  }

  const amountLabel = formatPrice(getMonthlyFeePaise(course));

  return (
    <div>
      <Link href="/profile/courses" className="text-sm text-primary hover:underline">
        ← My courses
      </Link>

      <h2 className="mt-4 font-serif text-lg font-semibold text-foreground">Pay Fee</h2>
      <p className="mt-1 text-sm text-muted">{course.title}</p>
      <p className="mt-2 text-sm font-medium text-foreground">Amount: {amountLabel} per month</p>

      <div className="mx-auto mt-8 max-w-5xl space-y-8">
        <PaymentDetailsPanel
          amountLabel={amountLabel}
          amountPaise={getMonthlyFeePaise(course)}
          paymentNote={`${course.title} monthly`.slice(0, 80)}
        />
        <div className="card-elevated p-6 sm:p-8">
          <h3 className="text-sm font-bold uppercase tracking-wide text-primary">Submit payment</h3>
          <p className="mt-2 text-sm text-muted">
            After paying by UPI or bank transfer, select the month and enter your transaction reference.
          </p>
          <div className="mt-6">
            <MonthlyPaymentForm courseId={course.id} monthlyFeePaise={getMonthlyFeePaise(course)} />
          </div>
        </div>
      </div>
    </div>
  );
}
