import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/admin";
import { getCertificateFilename, hasUploadedCertificate } from "@/lib/certificate";
import { getCourseById } from "@/lib/courses";
import { prisma } from "@/lib/prisma";
import { withDbErrorHandling } from "@/lib/db-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ enrollmentId: string }> },
) {
  const { enrollmentId } = await params;
  const inline = new URL(request.url).searchParams.get("inline") === "1";

  const enrollment = await withDbErrorHandling(() => prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        userId: true,
        courseId: true,
        status: true,
        uploadedCertificatePath: true,
      },
    }), "Database operation failed");

  if (!enrollment || !hasUploadedCertificate(enrollment)) {
    return NextResponse.json({ error: "Certificate is not available yet." }, { status: 404 });
  }

  const session = await auth();
  const isOwner = session?.user?.id === enrollment.userId;
  const isAdmin = isAdminSession(session);

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const course = await getCourseById(enrollment.courseId);
  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  const absolutePath = path.join(
    process.cwd(),
    "public",
    enrollment.uploadedCertificatePath!.replace(/^\//, ""),
  );

  try {
    const pdfBytes = await readFile(absolutePath);
    const filename = getCertificateFilename(course.title, enrollmentId);

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT")) { throw error; }
    console.error("Caught error:", error);
    return NextResponse.json({ error: "Certificate file not found." }, { status: 404 });
    }
}
