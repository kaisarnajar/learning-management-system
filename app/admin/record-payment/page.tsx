import Link from "next/link";
import { RecordPaymentForm } from "@/components/admin/RecordPaymentForm";
import { getStudentUsers } from "@/lib/students";
import { getAllCourses } from "@/lib/courses";

export default async function AdminRecordPaymentPage() {
  const [students, courses] = await Promise.all([
    getStudentUsers(),
    getAllCourses(),
  ]);

  return (
    <div>
      <Link
        href="/admin/finance?tab=income"
        className="text-sm text-primary hover:underline"
      >
        ← Back to Income
      </Link>

      <h1 className="mt-4 font-serif text-2xl font-bold text-primary">Record payment</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Manually log a payment received from a student. The entry will appear on the Finance income tab and on the student&apos;s profile.
      </p>

      <div className="mt-8 max-w-2xl">
        <RecordPaymentForm
          students={students.map((s) => ({ id: s.id, name: s.name, email: s.email, registrationNumber: s.registrationNumber }))}
          courses={courses.map((c) => ({ id: c.id, title: c.title }))}
        />
      </div>
    </div>
  );
}
