"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateCertificate } from "@/app/actions/certificates";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { labelClassName, inputClassName } from "@/utils/form";
import { useToast } from "@/components/shared/ToastProvider";

type EnrollmentItem = {
  id: string;
  user: {
    name: string | null;
    email: string;
  };
  course: {
    id: string;
    title: string;
  };
};

type GenerateCertificateFormProps = {
  enrollments: EnrollmentItem[];
};

export function GenerateCertificateForm({ enrollments }: GenerateCertificateFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [enrollmentId, setEnrollmentId] = useState("");
  const [type, setType] = useState<"APPRECIATION" | "COMPLETION">("APPRECIATION");
  const [grade, setGrade] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);

  // Extract unique courses list from the enrollments
  const coursesMap = new Map<string, string>();
  enrollments.forEach((env) => {
    if (env.course.id) {
      coursesMap.set(env.course.id, env.course.title);
    }
  });
  const availableCourses = Array.from(coursesMap.entries()).map(([id, title]) => ({ id, title }));

  const filteredEnrollments = enrollments.filter((env) => env.course.id === selectedCourseId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentId) {
      setError("Please select a student.");
      return;
    }
    if (type === "COMPLETION" && (grade === "" || isNaN(grade as number))) {
      setError("Grade is required for a Certificate of Completion.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await generateCertificate(enrollmentId, type, grade === "" ? undefined : (grade as number));
      if (result && "error" in result && result.error) {
        setError(result.error as string);
        addToast(result.error as string, "error");
      } else {
        addToast("Certificate generated successfully.", "success");
        // Redirect to preview page
        router.push(`/admin/certificates/${enrollmentId}`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card-elevated space-y-5 p-5 sm:p-6 bg-surface border border-border rounded-xl">
      {error && (
        <div className="rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text" role="alert">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="courseId" className={labelClassName}>
          Select Course
        </label>
        <select
          id="courseId"
          value={selectedCourseId}
          onChange={(e) => {
            setSelectedCourseId(e.target.value);
            setEnrollmentId("");
          }}
          className={`${inputClassName} mt-1 w-full bg-background`}
          disabled={isPending}
          required
        >
          <option value="">-- Choose course --</option>
          {availableCourses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="enrollmentId" className={labelClassName}>
          Select Student
        </label>
        <select
          id="enrollmentId"
          value={enrollmentId}
          onChange={(e) => setEnrollmentId(e.target.value)}
          className={`${inputClassName} mt-1 w-full bg-background`}
          disabled={isPending || !selectedCourseId}
          required
        >
          <option value="">-- Choose student --</option>
          {filteredEnrollments.map((env) => (
            <option key={env.id} value={env.id}>
              {env.user.name || env.user.email}
            </option>
          ))}
        </select>
        {selectedCourseId && filteredEnrollments.length === 0 && (
          <p className="mt-2 text-xs text-muted">
            All students in this course already have certificates generated.
          </p>
        )}
        {enrollments.length === 0 && (
          <p className="mt-2 text-xs text-muted">
            All active students currently have certificates generated. No pending enrollments.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="certificateType" className={labelClassName}>
          Certificate Type
        </label>
        <select
          id="certificateType"
          value={type}
          onChange={(e) => setType(e.target.value as "APPRECIATION" | "COMPLETION")}
          className={`${inputClassName} mt-1 w-full bg-background`}
          disabled={isPending}
          required
        >
          <option value="APPRECIATION">Certificate of Appreciation</option>
          <option value="COMPLETION">Certificate of Completion</option>
        </select>
      </div>

      {type === "COMPLETION" && (
        <div>
          <label htmlFor="grade" className={labelClassName}>
            Grade (0 to 10)
          </label>
          <input
            id="grade"
            type="number"
            min="0"
            max="10"
            step="0.1"
            value={grade}
            onChange={(e) => setGrade(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="e.g. 9.5"
            className={`${inputClassName} mt-1 w-full`}
            disabled={isPending}
            required
          />
        </div>
      )}

      <div className="flex justify-end pt-2">
        <SubmitButton
          disabled={isPending || enrollments.length === 0 || !enrollmentId}
          isSubmitting={isPending}
          className="min-h-11 px-6 rounded-md bg-primary text-white font-semibold hover:bg-primary-light transition-colors disabled:opacity-60"
        >
          Generate Certificate
        </SubmitButton>
      </div>
    </form>
  );
}
