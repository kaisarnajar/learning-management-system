import { generatePdfFromHtml, loadStandardPdfAssets, wrapHtmlForPdf } from "@/lib/pdf-generator";
import { prisma } from "@/lib/prisma";
import { getSocialLinksSettings, formatWhatsAppForDisplay } from "@/lib/social-links";
import { getAcademySettings } from "@/lib/academy-settings";
import { BRAND_CONFIG } from "@/config/brand";
import { AUTHORITY_SIGNATURE } from "@/lib/academy-contact";
import { formatRollNumber } from "@/lib/roll-numbers";


export type AttendanceCardRecordData = {
  date: string;
  status: "Present" | "Absent";
};

export type AttendanceCardData = {
  academyName: string;
  academyAddress: string;
  academyPhone: string;
  academyEmail: string;
  academyWebsite: string;
  logoUrl: string;
  studentName: string;
  rollNumber: string;
  studentEmail: string;
  courseTitle: string;
  issueDate: string;
  records: AttendanceCardRecordData[];
  totalClasses: number;
  totalPresent: number;
  totalAbsent: number;
  attendancePercentage: number;
  signatureUrl: string;
  stampUrl: string;
  authorityName: string;
  authorityDesignation: string;
};

export function renderAttendanceCardToHtml(data: AttendanceCardData): string {
  // Partition records into pages based on capacities
  const total = data.records.length;
  let pagesRecords: AttendanceCardRecordData[][] = [];

  if (total <= 15) {
    pagesRecords = [data.records];
  } else if (total <= 42) {
    const page2Count = Math.min(20, Math.floor(total / 2));
    const page1Count = total - page2Count;
    pagesRecords = [
      data.records.slice(0, page1Count),
      data.records.slice(page1Count)
    ];
  } else {
    const remaining = [...data.records];
    pagesRecords.push(remaining.splice(0, 22));
    while (remaining.length > 0) {
      if (remaining.length <= 20) {
        pagesRecords.push(remaining.splice(0, remaining.length));
      } else if (remaining.length <= 26) {
        const half = Math.ceil(remaining.length / 2);
        pagesRecords.push(remaining.splice(0, half));
      } else {
        pagesRecords.push(remaining.splice(0, 26));
      }
    }
  }

  const pagesHtml = pagesRecords.map((pageRecords, index) => {
    const isFirstPage = index === 0;
    const isLastPage = index === pagesRecords.length - 1;

    return `
<div class="page-container">
  <div class="w-full h-full border-pdf-lg border-brand-primary rounded-xl p-6 bg-surface-cream relative flex flex-col justify-between" style="box-sizing: border-box; height: 100%;">
    <!-- Watermark -->
    <div class="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
      <img src="${data.logoUrl}" class="w-[300px] process-white-bg" alt="Watermark" />
    </div>

    <div class="relative z-10 flex flex-col justify-between h-full">
      <!-- Top Content (Header + Details + Table) -->
      <div>
        <!-- Header Section -->
        <header class="border-b-2 border-brand-primary pb-3 mb-4 flex flex-col">
          <div class="flex justify-between items-center w-full">
            <!-- Top Left: Logo -->
            <div class="relative w-20 h-20">
              <img src="${data.logoUrl}" alt="${data.academyName} Logo" class="object-contain w-full h-full process-white-bg" />
            </div>
            <!-- Top Right: Academy Name & Arabic Verse -->
            <div class="text-right flex flex-col items-end">
              <h1 class="text-2xl font-serif font-bold text-brand-primary tracking-wide mb-0.5 uppercase">
                ${data.academyName}
              </h1>
              <h2 class="text-base font-bold text-brand-primary mt-0.5" style="font-family: 'Scheherazade New', 'Amiri', serif; line-height: 1; word-spacing: 2px;">
                خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ
              </h2>
            </div>
          </div>
          <!-- Academy info below header -->
          <div class="text-center mt-2.5 text-pdf-10 text-slate-600 flex justify-between items-center w-full border-t border-slate-200 pt-2">
            <span>Address: ${data.academyAddress}</span>
            <span>Phone: ${data.academyPhone} | Email: ${data.academyEmail}</span>
            <span>Website: ${data.academyWebsite}</span>
          </div>
        </header>

        ${isFirstPage ? `
        <!-- Title -->
        <div class="text-center mb-4">
          <h2 class="text-xl font-bold tracking-widest text-brand-primary uppercase text-sm">
            Student Attendance Card
          </h2>
        </div>

        <!-- Student & Course Details -->
        <div class="grid grid-cols-2 gap-4 mb-4 bg-white border-l-4 border-brand-primary p-4 rounded-r border border-slate-100 shadow-sm text-xs">
          <div class="space-y-0.5">
            <h3 class="text-pdf-10 font-bold text-slate-400 uppercase tracking-wider mb-1">Student Information</h3>
            <p class="font-bold text-sm text-slate-800">${data.studentName}</p>
            <p class="text-slate-600">Roll Number: <span class="font-semibold">${data.rollNumber}</span></p>
            <p class="text-slate-600">Email: <span class="font-medium">${data.studentEmail}</span></p>
          </div>
          <div class="space-y-0.5">
            <h3 class="text-pdf-10 font-bold text-slate-400 uppercase tracking-wider mb-1">Academic Course</h3>
            <p class="font-bold text-sm text-brand-primary">${data.courseTitle}</p>
            <p class="text-slate-600">Issue Date: <span class="font-medium">${data.issueDate}</span></p>
          </div>
        </div>
        ` : ''}

        <!-- Attendance Table -->
        <div class="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-brand-primary text-white text-left text-pdf-11 uppercase tracking-wider">
                <th class="py-2.5 px-4 font-semibold">Date</th>
                <th class="py-2.5 px-4 font-semibold text-right">Attendance Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 text-xs">
              ${pageRecords.length === 0 ? `
                <tr>
                  <td colspan="2" class="py-6 px-4 text-center text-slate-400 italic">
                    No attendance records found for this student.
                  </td>
                </tr>
              ` : pageRecords.map(record => `
                <tr class="hover:bg-slate-50/50">
                  <td class="py-2 px-4 font-medium text-slate-800">${record.date}</td>
                  <td class="py-2 px-4 text-right">
                    <span class="inline-flex px-2 py-0.5 rounded text-pdf-10 font-bold ${
                      record.status === "Present" 
                        ? "bg-emerald-100 text-emerald-800" 
                        : "bg-rose-100 text-rose-800"
                    }">
                      ${record.status}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      ${isLastPage ? `
      <!-- Bottom Content (Summary + Footer) -->
      <div class="mt-4">
        <!-- Summary Section -->
        <div class="grid grid-cols-4 gap-4 bg-white border-y-2 border-brand-primary py-3 px-4 mb-4 text-center rounded shadow-sm border border-slate-100">
          <div>
            <div class="text-pdf-9 font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Classes</div>
            <div class="text-base font-bold text-slate-800">${data.totalClasses}</div>
          </div>
          <div>
            <div class="text-pdf-9 font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Present</div>
            <div class="text-base font-bold text-emerald-600">${data.totalPresent}</div>
          </div>
          <div>
            <div class="text-pdf-9 font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Absent</div>
            <div class="text-base font-bold text-rose-600">${data.totalAbsent}</div>
          </div>
          <div>
            <div class="text-pdf-9 font-bold text-slate-400 uppercase tracking-wider mb-0.5">Attendance Rate</div>
            <div class="text-base font-bold text-brand-primary">${data.attendancePercentage}%</div>
          </div>
        </div>

        <!-- Footer Section -->
        <div class="flex justify-between items-end mt-4">
          <div class="w-7/12 pr-4">
            <p class="text-pdf-9 text-slate-500 leading-relaxed bg-white border border-slate-200/80 rounded p-2.5 italic shadow-sm">
              This Attendance Card is an official attendance record issued by ${BRAND_CONFIG.name}.
            </p>
          </div>
          <div class="w-5/12 text-center flex flex-col items-center relative">
            <div class="relative flex justify-center items-center h-[70px] w-full">
              ${data.stampUrl ? `<img src="${data.stampUrl}" alt="Official Stamp" class="w-16 absolute z-10 opacity-90 process-white-bg mix-blend-multiply" style="top: 50%; left: 50%; transform: translate(-50%, -50%);" />` : ''}
              ${data.signatureUrl ? `<img src="${data.signatureUrl}" alt="Authorized Signature" class="max-h-[60px] max-w-[120px] object-contain relative z-20 translate-y-1 process-white-bg" />` : ''}
            </div>
            <div class="w-full border-t border-slate-300 pt-1 relative z-30">
              <p class="font-bold text-pdf-10 text-slate-850">${data.authorityName}</p>
              <p class="text-pdf-9 text-slate-500">${data.authorityDesignation}</p>
            </div>
          </div>
        </div>
      </div>
      ` : ''}
    </div>
  </div>
</div>
    `;
  }).join('\n');

  return `
  ${pagesHtml}

  `;
}

export async function generateAttendanceCardPdf(enrollmentId: string): Promise<Buffer> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        }
      }
    }
  });

  if (!enrollment) throw new Error("Enrollment not found");

  const course = await prisma.course.findUnique({
    where: { id: enrollment.courseId },
    select: {
      id: true,
      title: true,
    }
  });

  if (!course) throw new Error("Course not found");

  // Load attendance records
  const records = await prisma.courseAttendanceRecord.findMany({
    where: { enrollmentId },
    include: {
      attendance: {
        select: {
          date: true,
        }
      }
    },
    orderBy: {
      attendance: {
        date: "asc"
      }
    }
  });

  // Calculate stats
  const totalClasses = records.length;
  const totalPresent = records.filter((r) => r.isPresent).length;
  const totalAbsent = totalClasses - totalPresent;
  const attendancePercentage = totalClasses === 0 ? 0 : Math.round((totalPresent / totalClasses) * 100);

  // Load static assets
  const { base64Logo, base64Signature, base64Stamp, base64Font } = await loadStandardPdfAssets();

  const [socialLinks, academySettings] = await Promise.all([
    getSocialLinksSettings(),
    getAcademySettings(),
  ]);

  const recordsData: AttendanceCardRecordData[] = records.map(r => ({
    date: r.attendance.date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }),
    status: r.isPresent ? "Present" : "Absent"
  }));

  const data: AttendanceCardData = {
    academyName: academySettings.academyName,
    academyAddress: academySettings.academyAddress,
    academyPhone: formatWhatsAppForDisplay(socialLinks.whatsappNumber) || "",
    academyEmail: socialLinks.contactEmail || "",
    academyWebsite: academySettings.academyWebsite,
    logoUrl: base64Logo,
    studentName: enrollment.user.name || "Student",
    rollNumber: formatRollNumber(enrollment.rollNumber),
    studentEmail: enrollment.user.email,
    courseTitle: course.title,
    issueDate: new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }),
    records: recordsData,
    totalClasses,
    totalPresent,
    totalAbsent,
    attendancePercentage,
    signatureUrl: base64Signature,
    stampUrl: base64Stamp,
    authorityName: AUTHORITY_SIGNATURE.name,
    authorityDesignation: AUTHORITY_SIGNATURE.designation
  };

  const html = wrapHtmlForPdf(renderAttendanceCardToHtml(data), { base64Font });
  const pdfBuffer = await generatePdfFromHtml(html, {
    format: "A4",
    landscape: false
  });

  return pdfBuffer;
}
