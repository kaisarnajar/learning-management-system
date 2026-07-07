"use client";
import { SubmitButton } from "@/components/shared/SubmitButton";

import { useActionState, useState } from "react";
import { recordStudentPayment, type RecordPaymentState } from "@/app/admin/record-payment/actions";
import { previewStudentAccountForEnrollment } from "@/app/admin/enrollments/actions";
import { inputClassName, labelClassName } from "@/utils/form";
import type { Course } from "@prisma/client";

type RecordPaymentFormProps = {
  courses: Pick<Course, "id" | "title">[];
};

const initialState: RecordPaymentState = {};

export function RecordPaymentForm({ courses }: RecordPaymentFormProps) {
  const [state, formAction, pending] = useActionState(recordStudentPayment, initialState);
  
  const [email, setEmail] = useState("");
  const [linkedName, setLinkedName] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  async function runLookup(targetEmail: string) {
    const trimmed = targetEmail.trim();
    if (!trimmed) {
      setLinkedName("");
      setLookupError("");
      return;
    }

    setLookupLoading(true);
    setLookupError("");
    try {
      const result = await previewStudentAccountForEnrollment(trimmed);
      if (result.ok) {
        setLinkedName(result.name);
        setLookupError("");
      } else {
        setLinkedName("");
        setLookupError(result.error);
      }
    } catch {
      setLookupError("Could not verify this email. Try again.");
      setLinkedName("");
    } finally {
      setLookupLoading(false);
    }
  }

  const canSubmit = !lookupError && (email.trim().length === 0 || Boolean(linkedName));

  return (
    <form action={formAction} className="card-elevated space-y-4 p-5 sm:p-6">
      {state.error && (
        <p className="rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">{state.success}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className={labelClassName}>
            Registered account email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => runLookup(email)}
            placeholder="student@example.com"
            className={`${inputClassName} mt-1`}
          />
          {lookupError && (
            <p className="mt-2 rounded-md bg-warning-bg px-3 py-2 text-sm text-warning-text" role="alert">
              {lookupError}
            </p>
          )}
        </div>

        <div>
          <label className={labelClassName}>Name (from account)</label>
          <p
            className={`mt-1 rounded-md border border-border bg-background/60 px-3 py-2.5 text-sm ${
              linkedName ? "font-medium text-foreground" : "text-muted"
            }`}
          >
            {lookupLoading
              ? "Checking account…"
              : linkedName || "Enter an email above to load the account name."}
          </p>
        </div>

        <div>
          <label htmlFor="amountInr" className={labelClassName}>
            Amount (₹)
          </label>
          <input
            id="amountInr"
            name="amountInr"
            type="number"
            min="1"
            step="0.01"
            required
            placeholder="349"
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="paidAt" className={labelClassName}>
            Payment date
          </label>
          <input
            id="paidAt"
            name="paidAt"
            type="date"
            required
            defaultValue={today}
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="paymentType" className={labelClassName}>
            Type
          </label>
          <select id="paymentType" name="paymentType" className={inputClassName} defaultValue="monthly" required>
            <option value="monthly">Monthly Fee</option>
            <option value="quarterly">Quarterly Fee</option>
            <option value="half_yearly">Half Yearly Fee</option>
            <option value="yearly">Yearly Fee</option>
            <option value="enrollment">Enrollment Fee</option>
            <option value="manual">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="courseId" className={labelClassName}>
            Course (optional)
          </label>
          <select id="courseId" name="courseId" className={inputClassName} defaultValue="">
            <option value="">— General / not course-specific —</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <SubmitButton
        type="submit"
        disabled={pending || !canSubmit}
        className="min-h-11 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving…" : "Add payment"}
      </SubmitButton>
    </form>
  );
}
