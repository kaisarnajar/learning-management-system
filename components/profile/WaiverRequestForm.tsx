"use client";

import { useState } from "react";
import { submitWaiverRequest } from "@/app/actions/waiver";
import { SubmitButton } from "@/components/shared/SubmitButton";

export function WaiverRequestForm({ courses, defaultCourseId, defaultReason }: { courses: { id: string; title: string }[], defaultCourseId?: string, defaultReason?: string }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function action(formData: FormData) {
    setError("");
    setSuccess(false);

    const result = await submitWaiverRequest(formData);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      (document.getElementById("waiver-form") as HTMLFormElement).reset();
    }
  }

  return (
    <form id="waiver-form" action={action} className="space-y-4 max-w-xl bg-white p-6 border rounded-lg shadow-sm">
      <h2 className="text-xl font-serif font-semibold text-foreground">Request Fee Waiver</h2>
      <p className="text-sm text-muted">
        If you are unable to pay the course fees, you can request a fee waiver here. The administration will review your request and may provide you with a special coupon code.
      </p>

      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded">Your request has been submitted successfully!</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700">Course</label>
        <select required name="courseId" defaultValue={defaultCourseId} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
          <option value="">Select a course...</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Reason</label>
        <textarea required name="reason" defaultValue={defaultReason} rows={4} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" placeholder="Please explain why you need a fee waiver..." />
      </div>

      <SubmitButton className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-light">Submit Request</SubmitButton>
    </form>
  );
}
