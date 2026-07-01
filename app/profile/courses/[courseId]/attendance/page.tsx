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
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Your Attendance</h2>
          <p className="text-gray-500 text-sm mt-1">Review your presence across all conducted sessions.</p>
        </div>
        <div className="flex gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{total}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Sessions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">{present}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Present</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-600">{absent}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Absent</div>
          </div>
          <div className="pl-6 border-l border-gray-200">
            <div className={`text-2xl font-bold ${percentage >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {percentage}%
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Rate</div>
          </div>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No attendance records found yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(record.attendance.date))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {record.isPresent ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        Present
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
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
