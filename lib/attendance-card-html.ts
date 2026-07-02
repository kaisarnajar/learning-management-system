import { PROCESS_IMAGE_SCRIPT } from "./html-scripts";
import { generatePdfFromHtml } from "@/lib/pdf-generator";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import { getSocialLinksSettings, formatWhatsAppForDisplay } from "@/lib/social-links";
import { getAcademySettings } from "@/lib/academy-settings";
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
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@400;700&family=Amiri:wght@400;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      -webkit-print-color-adjust: exact;
    }
  </style>
</head>
<body class="p-10">
  <div class="max-w-4xl mx-auto border-[10px] border-[#0f3d2e] rounded-xl p-8 bg-[#fdfaf3] relative" style="min-height: 720px;">
    <!-- Watermark -->
    <div class="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
      <img src="${data.logoUrl}" class="w-[350px] process-white-bg" alt="Watermark" />
    </div>

    <div class="relative z-10">
      <!-- Header Section -->
      <header class="border-b-4 border-[#0f3d2e] pb-6 mb-8 flex flex-col">
        <div class="flex justify-between items-center w-full">
          <!-- Top Left: Logo -->
          <div class="relative w-28 h-28">
            <img src="${data.logoUrl}" alt="${data.academyName} Logo" class="object-contain w-full h-full process-white-bg" />
          </div>
          <!-- Top Right: Academy Name & Arabic Verse -->
          <div class="text-right flex flex-col items-end">
            <h1 class="text-3xl font-serif font-bold text-[#0f3d2e] tracking-wide mb-1 uppercase">
              ${data.academyName}
            </h1>
            <h2 class="text-xl font-bold text-[#0f3d2e] mt-1" style="font-family: 'Scheherazade New', 'Amiri', serif; line-height: 1; word-spacing: 2px;">
              خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ
            </h2>
          </div>
        </div>
        <!-- Academy info below header -->
        <div class="text-center mt-4 text-[11px] text-slate-600 flex justify-between items-center w-full border-t border-slate-200 pt-3">
          <span>Address: ${data.academyAddress}</span>
          <span>Phone: ${data.academyPhone} | Email: ${data.academyEmail}</span>
          <span>Website: ${data.academyWebsite}</span>
        </div>
      </header>

      <!-- Title -->
      <div class="text-center mb-8">
        <h2 class="text-2xl font-bold tracking-widest text-[#0f3d2e] uppercase">
          Student Attendance Card
        </h2>
      </div>

      <!-- Student & Course Details -->
      <div class="grid grid-cols-2 gap-8 mb-8 bg-white border-l-4 border-[#0f3d2e] p-5 rounded-r border border-slate-100 shadow-sm">
        <div class="space-y-1">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Student Information</h3>
          <p class="font-bold text-base text-slate-850">${data.studentName}</p>
          <p class="text-slate-600 text-xs">Roll Number: <span class="font-semibold">${data.rollNumber}</span></p>
          <p class="text-slate-600 text-xs">Email: <span class="font-medium">${data.studentEmail}</span></p>
        </div>
        <div class="space-y-1">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Academic Course</h3>
          <p class="font-bold text-base text-[#0f3d2e]">${data.courseTitle}</p>
          <p class="text-slate-600 text-xs">Issue Date: <span class="font-medium">${data.issueDate}</span></p>
        </div>
      </div>

      <!-- Attendance Table -->
      <div class="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm mb-8">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-[#0f3d2e] text-white text-left text-xs uppercase tracking-wider">
              <th class="py-3 px-4 font-semibold">Date</th>
              <th class="py-3 px-4 font-semibold text-right">Attendance Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 text-xs">
            ${data.records.length === 0 ? `
              <tr>
                <td colspan="2" class="py-6 px-4 text-center text-slate-400 italic">
                  No attendance records found for this student.
                </td>
              </tr>
            ` : data.records.map(record => `
              <tr class="hover:bg-slate-50/50">
                <td class="py-3 px-4 font-medium text-slate-800">${record.date}</td>
                <td class="py-3 px-4 text-right">
                  <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
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

      <!-- Summary Section -->
      <div class="grid grid-cols-4 gap-4 bg-white border-y-2 border-[#0f3d2e] py-4 px-5 mb-10 text-center rounded shadow-sm border border-slate-100">
        <div>
          <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Classes</div>
          <div class="text-lg font-bold text-slate-800">${data.totalClasses}</div>
        </div>
        <div>
          <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Present</div>
          <div class="text-lg font-bold text-emerald-600">${data.totalPresent}</div>
        </div>
        <div>
          <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Absent</div>
          <div class="text-lg font-bold text-rose-600">${data.totalAbsent}</div>
        </div>
        <div>
          <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Attendance Rate</div>
          <div class="text-lg font-bold text-[#0f3d2e]">${data.attendancePercentage}%</div>
        </div>
      </div>

      <!-- Footer Section -->
      <div class="flex justify-between items-end mt-12 break-inside-avoid">
        <div class="w-7/12 pr-6">
          <p class="text-[10px] text-slate-500 leading-relaxed bg-white border border-slate-200/80 rounded p-3 italic shadow-sm">
            This Attendance Card is an official attendance record issued by Darse Quran Academy.
          </p>
        </div>
        <div class="w-5/12 text-center flex flex-col items-center relative">
          <div class="relative flex justify-center items-center h-[100px] w-full">
            ${data.stampUrl ? `<img src="${data.stampUrl}" alt="Official Stamp" class="w-20 absolute z-10 opacity-90 process-white-bg mix-blend-multiply" style="top: 50%; left: 50%; transform: translate(-50%, -50%);" />` : ''}
            ${data.signatureUrl ? `<img src="${data.signatureUrl}" alt="Authorized Signature" class="max-h-[85px] max-w-[160px] object-contain relative z-20 translate-y-2 process-white-bg" />` : ''}
          </div>
          <div class="w-full border-t border-slate-300 pt-2 relative z-30">
            <p class="font-bold text-xs text-slate-850">${data.authorityName}</p>
            <p class="text-[10px] text-slate-500">${data.authorityDesignation}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script>
    ${PROCESS_IMAGE_SCRIPT}
  </script>
</body>
</html>
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
  let base64Logo = "";
  let base64Signature = "";
  let base64Stamp = "";

  try {
    const logoPath = path.join(process.cwd(), "public", "assets", "logo.png");
    const sigPath = path.join(process.cwd(), "public", "assets", "signature.png");
    const stampPath = path.join(process.cwd(), "public", "assets", "stamp.png");

    const [logoBytes, sigBytes, stampBytes] = await Promise.all([
      fs.readFile(logoPath).catch(() => null),
      fs.readFile(sigPath).catch(() => null),
      fs.readFile(stampPath).catch(() => null),
    ]);

    if (logoBytes) base64Logo = `data:image/png;base64,${logoBytes.toString("base64")}`;
    if (sigBytes) base64Signature = `data:image/png;base64,${sigBytes.toString("base64")}`;
    if (stampBytes) base64Stamp = `data:image/png;base64,${stampBytes.toString("base64")}`;
  } catch (e) {
    console.error("[attendance-card-html] Could not load local assets:", e);
  }

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

  const html = renderAttendanceCardToHtml(data);
  const pdfBuffer = await generatePdfFromHtml(html, {
    format: "A4",
    landscape: false
  });

  return pdfBuffer;
}
