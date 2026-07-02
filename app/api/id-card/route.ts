import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withDbErrorHandling } from "@/lib/db-error";
import { generateIdCardPdf } from "@/lib/id-card-html";
import { isAdminSession } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const inline = searchParams.get("inline") === "1";
  const requestedUserId = searchParams.get("userId");

  if (!requestedUserId) {
    return NextResponse.json({ error: "userId parameter is required." }, { status: 400 });
  }

  const targetUserId = requestedUserId;

  const user = await withDbErrorHandling(() => prisma.user.findUnique({
    where: { id: targetUserId },
  }), "Database operation failed");

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const pdfBuffer = await generateIdCardPdf(user);

  const filename = `ID_Card_${user.name?.replace(/\s+/g, '_') || "Student"}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}
