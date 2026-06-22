import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import puppeteerCore from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/admin";
import { getCourseById } from "@/lib/courses";
import { getCertificateFilename, canDownloadCertificate } from "@/lib/certificate";
import { prisma } from "@/lib/prisma";
import { withDbErrorHandling } from "@/lib/db-error";
import { getSocialLinksSettings, formatWhatsAppForDisplay } from "@/lib/social-links";
import { getAcademySettings } from "@/lib/academy-settings";
import { renderCertificateToHtml } from "@/lib/certificate-html";
import fs from "fs/promises";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ enrollmentId: string }> },
) {
  const { enrollmentId } = await params;
  const inline = new URL(request.url).searchParams.get("inline") === "1";

  const enrollment = await withDbErrorHandling(() => prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        user: { select: { id: true, name: true, email: true, address: true, whatsapp: true } },
      },
    }), "Database operation failed");

  if (!enrollment) {
    return NextResponse.json({ error: "Certificate is not available yet." }, { status: 404 });
  }

  const course = await getCourseById(enrollment.courseId);
  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  if (!canDownloadCertificate(course.status, enrollment.status)) {
    return NextResponse.json({ error: "Certificate is not available yet." }, { status: 404 });
  }

  const session = await auth();
  const isOwner = session?.user?.id === enrollment.userId;
  const isAdmin = isAdminSession(session);

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!enrollment.certificateGeneratedAt || !enrollment.certificateNumber) {
    return NextResponse.json({ error: "Certificate has not been generated yet." }, { status: 400 });
  }

  const filename = getCertificateFilename(course.title, enrollmentId);
  
  // 1. Fetch Dynamic Configuration
  const [socialLinks, academySettings] = await Promise.all([
    getSocialLinksSettings(),
    getAcademySettings(),
  ]);
  
  // 2. Read Images and convert to Base64 to guarantee rendering inside Puppeteer
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
    
    if (logoBytes) base64Logo = `data:image/png;base64,${logoBytes.toString('base64')}`;
    if (sigBytes) base64Signature = `data:image/png;base64,${sigBytes.toString('base64')}`;
    if (stampBytes) base64Stamp = `data:image/png;base64,${stampBytes.toString('base64')}`;
  } catch (e) {
    console.error("Could not load images:", e);
  }

  const issueDate = enrollment.completedAt 
    ? enrollment.completedAt.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  // 3. Assemble Data Layer
  const data = {
    studentName: enrollment.user.name || "Student",
    address: enrollment.user.address || "N/A",
    courseName: course.title,
    issueDate,
    signatureUrl: base64Signature,
    sealUrl: base64Logo,
    stampUrl: base64Stamp,
    academyName: academySettings.academyName,
    academyEmail: socialLinks.contactEmail || "",
    academyPhone: formatWhatsAppForDisplay(socialLinks.whatsappNumber) || "",
    certificateNumber: enrollment.certificateNumber,
    certificateType: enrollment.certificateType || undefined,
    certificateGrade: enrollment.certificateGrade,
  };

  // 4. Generate HTML String
  const componentHtml = renderCertificateToHtml(data);

  // 5. Wrap in isolated HTML document with Tailwind CDN and Google Fonts
  const fullHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:wght@400;600;700&display=swap" rel="stylesheet" />
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
        }
        @page {
          size: A4 landscape;
          margin: 0;
        }
        body { 
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background: white !important;
          margin: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        /* Ensure SVGs inside base64 img tags or anywhere scale properly */
        img { max-width: 100%; height: auto; }
      </style>
    </head>
    <body>
      ${componentHtml}
    </body>
    </html>
  `;

  try {
    let browser;
    if (process.env.VERCEL) {
      browser = await puppeteerCore.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }

    const page = await browser.newPage();
    
    // Set content and wait for it to be loaded
    await page.setContent(fullHtml, { waitUntil: 'load' });
    
    // Wait for the Tailwind CDN script to fetch and apply
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }).catch(() => {});

    // Generate PDF (landscape for certificates)
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });

    await browser.close();

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${inline ? "inline" : "attachment"}; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error: any) {
    console.error('PDF Generation Error:', error?.stack || error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
