import { NextResponse } from "next/server";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";
import { generateGradeCardPdf } from "@/utils/grade-card-html";
import { isAdminSession } from "@/services/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const inline = searchParams.get("inline") === "1";
  const enrollmentId = searchParams.get("enrollmentId");

  if (!enrollmentId) {
    return NextResponse.json({ error: "enrollmentId parameter is required." }, { status: 400 });
  }

  const enrollment = await withDbErrorHandling(() => prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      user: {
        select: {
          name: true,
        }
      }
    }
  }), "Database operation failed");

  if (!enrollment) {
    return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });
  }

  try {
    const pdfBuffer = await generateGradeCardPdf(enrollmentId);
    const filename = `Grade_Card_${enrollment.user.name?.replace(/\s+/g, '_') || "Student"}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error) {
    console.error("Grade Card API generation error:", error);
    return NextResponse.json({ error: "Failed to generate Grade Card PDF." }, { status: 500 });
  }
}
