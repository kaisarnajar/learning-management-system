import { requireUser } from "@/lib/auth-actions";
import { getStudentAttendanceRecords } from "@/app/actions/attendance";

export default async function StudentCourseAttendancePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  await requireUser();
  const { courseId } = await params;
  const records = await getStudentAttendanceRecords(courseId);

  const total = records.length;
  const present = records.filter(r => r.isPresent).length;
  const absent = total - present;
  const percentage = total === 0 ? 0 : Math.round((present / total) * 100);

  return (
    <div className="py-6 space-y-6">
      <div className="bg-surface p-6 rounded-lg border border-border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Your Attendance</h2>
          <p className="text-muted text-sm mt-1">Review your presence across all conducted sessions.</p>
        </div>
        <div className="flex gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-foreground">{total}</div>
            <div className="text-xs text-muted uppercase tracking-wide">Sessions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{present}</div>
            <div className="text-xs text-muted uppercase tracking-wide">Present</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{absent}</div>
            <div className="text-xs text-muted uppercase tracking-wide">Absent</div>
          </div>
          <div className="pl-6 border-l border-border">
            <div className={`text-2xl font-bold ${percentage >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {percentage}%
            </div>
            <div className="text-xs text-muted uppercase tracking-wide">Rate</div>
          </div>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-lg border border-border">
          <p className="text-muted">No attendance records found yet.</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface-muted">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-surface-muted-hover transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(record.attendance.date))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {record.isPresent ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-bg text-success-text">
                        Present
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive-bg text-destructive-text">
                        Absent
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
