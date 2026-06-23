import { SubmitButton } from "@/components/shared/SubmitButton";
"use client";

import { useActionState, useState } from "react";
import {
  adminEnrollUser,
  previewStudentAccountForEnrollment,
  type AdminEnrollUserState,
} from "@/app/admin/enrollments/actions";
import { inputClassName, labelClassName } from "@/lib/form";
import type { Course } from "@prisma/client";

type AdminEnrollUserFormProps = {
  courses: Pick<Course, "id" | "title">[];
};

const initialState: AdminEnrollUserState = {};

export function AdminEnrollUserForm({ courses }: AdminEnrollUserFormProps) {
  const [state, formAction, pending] = useActionState(adminEnrollUser, initialState);
  const [email, setEmail] = useState("");
  const [linkedName, setLinkedName] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

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
      <div>
        <h2 className="font-serif text-lg font-semibold text-primary">Enroll a student manually</h2>
        <p className="mt-1 text-sm text-muted">
          The student must already have registered. Enter their email and choose a course to enroll them
          directly with full access.
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
        <label htmlFor="courseId" className={labelClassName}>
          Course
        </label>
        <select id="courseId" name="courseId" required className={inputClassName} defaultValue="">
          <option value="" disabled>
            Select a course
          </option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      <SubmitButton
        type="submit"
        disabled={pending || !canSubmit}
        className="min-h-11 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving…" : "Add enrollment"}
      </SubmitButton>
    </form>
  );
}
