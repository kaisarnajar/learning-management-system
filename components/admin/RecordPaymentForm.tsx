"use client";
import { SubmitButton } from "@/components/shared/SubmitButton";

import { useActionState, useState } from "react";
import { recordStudentPayment, type RecordPaymentState } from "@/app/admin/record-payment/actions";
import { inputClassName, labelClassName } from "@/lib/form";
import type { Course } from "@prisma/client";

type RecordPaymentFormProps = {
  students: { id: string; name: string | null; email: string; registrationNumber: string | null }[];
  courses: Pick<Course, "id" | "title">[];
};

const initialState: RecordPaymentState = {};

export function RecordPaymentForm({ students, courses }: RecordPaymentFormProps) {
  const [state, formAction, pending] = useActionState(recordStudentPayment, initialState);
  const [search, setSearch] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const filteredStudents = students.filter(s => {
    const q = search.toLowerCase();
    return (s.name?.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.registrationNumber?.toLowerCase().includes(q));
  }).slice(0, 20); // limit to 20 for performance in dropdown

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

      <div>
        <label htmlFor="studentSearch" className={labelClassName}>
          Select student
        </label>
        <div className="flex flex-col gap-2">
          <input
            id="studentSearch"
            type="text"
            placeholder="Search student by name, email, or reg number..."
            className={inputClassName}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select id="userId" name="userId" className={inputClassName} required size={4}>
            {filteredStudents.map((student) => (
              <option key={student.id} value={student.id} className="py-1">
                {student.name || "Unknown"} ({student.email}) {student.registrationNumber ? `[${student.registrationNumber}]` : ""}
              </option>
            ))}
            {filteredStudents.length === 0 && (
              <option disabled>No students match your search.</option>
            )}
          </select>
        </div>
      </div>

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
