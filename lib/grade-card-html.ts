import { PROCESS_IMAGE_SCRIPT } from "./html-scripts";
import { generatePdfFromHtml } from "@/lib/pdf-generator";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import { getSocialLinksSettings, formatWhatsAppForDisplay } from "@/lib/social-links";
import { getAcademySettings } from "@/lib/academy-settings";
import { BRAND_CONFIG } from "@/config/brand";
import { AUTHORITY_SIGNATURE } from "@/lib/academy-contact";
import { formatRollNumber } from "@/lib/roll-numbers";

export type GradeCardExamData = {
  title: string;
  date: string;
  marksObtained: number;
  maxMarks: number;
};

export type GradeCardData = {
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
  exams: GradeCardExamData[];
  totalExams: number;
  totalMarksObtained: number;
  totalMaxMarks: number;
  percentage: number;
  overallGrade: string;
  signatureUrl: string;
  stampUrl: string;
  authorityName: string;
  authorityDesignation: string;
};

export function getOverallGrade(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  if (percentage >= 40) return "E";
  return "F";
}

export function renderGradeCardToHtml(data: GradeCardData): string {
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
  <div class="max-w-4xl mx-auto border-pdf-thick border-brand-primary rounded-xl p-8 bg-surface-cream relative" style="min-height: 720px;">
    <!-- Watermark -->
    <div class="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
      <img src="${data.logoUrl}" class="w-[350px] process-white-bg" alt="Watermark" />
    </div>

    <div class="relative z-10">
      <!-- Header Section -->
      <header class="border-b-4 border-brand-primary pb-6 mb-8 flex flex-col">
        <div class="flex justify-between items-center w-full">
          <!-- Top Left: Logo -->
          <div class="relative w-28 h-28">
            <img src="${data.logoUrl}" alt="${data.academyName} Logo" class="object-contain w-full h-full process-white-bg" />
          </div>
          <!-- Top Right: Academy Name & Arabic Verse -->
          <div class="text-right flex flex-col items-end">
            <h1 class="text-3xl font-serif font-bold text-brand-primary tracking-wide mb-1 uppercase">
              ${data.academyName}
            </h1>
            <h2 class="text-xl font-bold text-brand-primary mt-1" style="font-family: 'Scheherazade New', 'Amiri', serif; line-height: 1; word-spacing: 2px;">
              خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ
            </h2>
          </div>
        </div>
        <!-- Academy info below header -->
        <div class="text-center mt-4 text-pdf-11 text-slate-600 flex justify-between items-center w-full border-t border-slate-200 pt-3">
          <span>Address: ${data.academyAddress}</span>
          <span>Phone: ${data.academyPhone} | Email: ${data.academyEmail}</span>
          <span>Website: ${data.academyWebsite}</span>
        </div>
      </header>

      <!-- Title -->
      <div class="text-center mb-8">
        <h2 class="text-2xl font-bold tracking-widest text-brand-primary uppercase">
          Student Grade Card
        </h2>
      </div>

      <!-- Student & Course Details -->
      <div class="grid grid-cols-2 gap-8 mb-8 bg-white border-l-4 border-brand-primary p-5 rounded-r border border-slate-100 shadow-sm">
        <div class="space-y-1">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Student Information</h3>
          <p class="font-bold text-base text-slate-800">${data.studentName}</p>
          <p class="text-slate-600 text-xs">Roll Number: <span class="font-semibold">${data.rollNumber}</span></p>
          <p class="text-slate-600 text-xs">Email: <span class="font-medium">${data.studentEmail}</span></p>
        </div>
        <div class="space-y-1">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Academic Course</h3>
          <p class="font-bold text-base text-brand-primary">${data.courseTitle}</p>
          <p class="text-slate-600 text-xs">Issue Date: <span class="font-medium">${data.issueDate}</span></p>
        </div>
      </div>

      <!-- Exams Table -->
      <div class="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm mb-8">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-brand-primary text-white text-left text-xs uppercase tracking-wider">
              <th class="py-3 px-4 font-semibold">Exam / Test Name</th>
              <th class="py-3 px-4 font-semibold">Date</th>
              <th class="py-3 px-4 font-semibold text-right">Marks Obtained</th>
              <th class="py-3 px-4 font-semibold text-right">Max Marks</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 text-xs">
            ${data.exams.length === 0 ? `
              <tr>
                <td colspan="4" class="py-6 px-4 text-center text-slate-400 italic">
                  No exams recorded for this student.
                </td>
              </tr>
            ` : data.exams.map(exam => `
              <tr class="hover:bg-slate-50/50">
                <td class="py-3 px-4 font-medium text-slate-800">${exam.title}</td>
                <td class="py-3 px-4 text-slate-500">${exam.date}</td>
                <td class="py-3 px-4 text-right font-mono font-bold text-emerald-600">${exam.marksObtained}</td>
                <td class="py-3 px-4 text-right font-mono text-slate-500">${exam.maxMarks}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Summary Section -->
      <div class="grid grid-cols-5 gap-4 bg-white border-y-2 border-brand-primary py-4 px-5 mb-10 text-center rounded shadow-sm border border-slate-100">
        <div>
          <div class="text-pdf-10 font-bold text-slate-400 uppercase tracking-wider mb-1">Total Exams</div>
          <div class="text-lg font-bold text-slate-800">${data.totalExams}</div>
        </div>
        <div>
          <div class="text-pdf-10 font-bold text-slate-400 uppercase tracking-wider mb-1">Obtained</div>
          <div class="text-lg font-bold text-emerald-600">${data.totalMarksObtained}</div>
        </div>
        <div>
          <div class="text-pdf-10 font-bold text-slate-400 uppercase tracking-wider mb-1">Max Marks</div>
          <div class="text-lg font-bold text-slate-800">${data.totalMaxMarks}</div>
        </div>
        <div>
          <div class="text-pdf-10 font-bold text-slate-400 uppercase tracking-wider mb-1">Percentage</div>
          <div class="text-lg font-bold text-brand-primary">${data.percentage}%</div>
        </div>
        <div>
          <div class="text-pdf-10 font-bold text-slate-400 uppercase tracking-wider mb-1">Overall Grade</div>
          <div class="text-lg font-bold text-amber-600">${data.overallGrade}</div>
        </div>
      </div>

      <!-- Footer Section -->
      <div class="flex justify-between items-end mt-12 break-inside-avoid">
        <div class="w-7/12 pr-6">
          <p class="text-pdf-10 text-slate-500 leading-relaxed bg-white border border-slate-200/80 rounded p-3 italic shadow-sm">
            This Grade Card is an official academic record issued by ${BRAND_CONFIG.name}.
          </p>
        </div>
        <div class="w-5/12 text-center flex flex-col items-center relative">
          <div class="relative flex justify-center items-center h-[100px] w-full">
            ${data.stampUrl ? `<img src="${data.stampUrl}" alt="Official Stamp" class="w-20 absolute z-10 opacity-90 process-white-bg mix-blend-multiply" style="top: 50%; left: 50%; transform: translate(-50%, -50%);" />` : ''}
            ${data.signatureUrl ? `<img src="${data.signatureUrl}" alt="Authorized Signature" class="max-h-[85px] max-w-[160px] object-contain relative z-20 translate-y-2 process-white-bg" />` : ''}
          </div>
          <div class="w-full border-t border-slate-300 pt-2 relative z-30">
            <p class="font-bold text-xs text-slate-850">${data.authorityName}</p>
            <p class="text-pdf-10 text-slate-500">${data.authorityDesignation}</p>
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

export async function generateGradeCardPdf(enrollmentId: string): Promise<Buffer> {
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

  // Load records
  const records = await prisma.courseGradeRecord.findMany({
    where: { enrollmentId },
    include: {
      grade: {
        select: {
          title: true,
          date: true,
          maxMarks: true,
        }
      }
    },
    orderBy: {
      grade: {
        date: "asc"
      }
    }
  });

  // Calculate totals
  const totalExams = records.length;
  let totalMarksObtained = 0;
  let totalMaxMarks = 0;

  for (const record of records) {
    totalMarksObtained += record.marksObtained;
    totalMaxMarks += record.grade.maxMarks;
  }

  const percentage = totalMaxMarks === 0 ? 0 : Math.round((totalMarksObtained / totalMaxMarks) * 100);
  const overallGrade = totalMaxMarks === 0 ? "—" : getOverallGrade(percentage);

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
    console.error("[grade-card-html] Could not load local assets:", e);
  }

  const [socialLinks, academySettings] = await Promise.all([
    getSocialLinksSettings(),
    getAcademySettings(),
  ]);

  const examsData: GradeCardExamData[] = records.map(r => ({
    title: r.grade.title,
    date: r.grade.date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }),
    marksObtained: r.marksObtained,
    maxMarks: r.grade.maxMarks
  }));

  const data: GradeCardData = {
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
    exams: examsData,
    totalExams,
    totalMarksObtained,
    totalMaxMarks,
    percentage,
    overallGrade,
    signatureUrl: base64Signature,
    stampUrl: base64Stamp,
    authorityName: AUTHORITY_SIGNATURE.name,
    authorityDesignation: AUTHORITY_SIGNATURE.designation
  };

  const html = renderGradeCardToHtml(data);
  const pdfBuffer = await generatePdfFromHtml(html, {
    format: "A4",
    landscape: false
  });

  return pdfBuffer;
}
