import { SubmitButton } from "@/components/shared/SubmitButton";
"use client";

import { useActionState } from "react";
import { recordStudentPayment, type RecordPaymentState } from "@/app/admin/students/payment-actions";
import { inputClassName, labelClassName } from "@/lib/form";
import type { Course } from "@prisma/client";

type RecordStudentPaymentFormProps = {
  userId: string;
  courses: Pick<Course, "id" | "title">[];
};

const initialState: RecordPaymentState = {};

export function RecordStudentPaymentForm({ userId, courses }: RecordStudentPaymentFormProps) {
  const boundAction = recordStudentPayment.bind(null, userId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="card-elevated space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="font-serif text-lg font-semibold text-primary">Record payment</h2>
        <p className="mt-1 text-sm text-muted">
          Add a payment entry visible on the student&apos;s profile. Amount is in Indian rupees (₹).
        </p>
      </div>

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

      <div>
        <label htmlFor="description" className={labelClassName}>
          Short description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          maxLength={500}
          placeholder="e.g. Monthly fee — March 2026, UPI ref 123456"
          className={inputClassName}
        />
      </div>

      <SubmitButton
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light disabled:opacity-60"
      >
        {pending ? "Saving…" : "Add payment"}
      </SubmitButton>
    </form>
  );
}
