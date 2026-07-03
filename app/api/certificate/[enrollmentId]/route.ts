import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/admin";
import { getCourseById } from "@/lib/courses";
import { getCertificateFilename, canDownloadCertificate, generateCertificatePdf } from "@/lib/certificate";
import { prisma } from "@/lib/prisma";
import { withDbErrorHandling } from "@/lib/db-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ enrollmentId: string }> },
) {
  const { enrollmentId } = await params;
  const inline = new URL(request.url).searchParams.get("inline") === "1";

  const session = await auth();
  const isAdmin = isAdminSession(session);

  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

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

  if (!enrollment.certificateGeneratedAt || !enrollment.certificateNumber) {
    return NextResponse.json({ error: "Certificate has not been generated yet." }, { status: 400 });
  }

  const filename = getCertificateFilename(course.title, enrollmentId);
  
  const issueDate = enrollment.certificateGeneratedAt 
    ? enrollment.certificateGeneratedAt.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  try {
    const pdfBuffer = await generateCertificatePdf({
      studentName: enrollment.user.name || "Student",
      studentAddress: enrollment.user.address,
      courseTitle: course.title,
      issueDate,
      certificateNumber: enrollment.certificateNumber,
      certificateType: (enrollment.certificateType as "APPRECIATION" | "COMPLETION" | null) || "COMPLETION",
      certificateGrade: enrollment.certificateGrade,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error("PDF Generation Error:", err.stack || err);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: err.message || String(error) },
      { status: 500 },
    );
  }
}
