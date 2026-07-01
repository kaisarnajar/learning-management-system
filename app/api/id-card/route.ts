import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withDbErrorHandling } from "@/lib/db-error";
import { renderIdCardToHtml } from "@/lib/id-card-html";
import { generatePdfFromHtml } from "@/lib/pdf-generator";
import fs from "fs/promises";
import path from "path";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const inline = new URL(request.url).searchParams.get("inline") === "1";

  const user = await withDbErrorHandling(() => prisma.user.findUnique({
    where: { id: session.user.id },
  }), "Database operation failed");

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

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
    
    if (logoBytes) base64Logo = `data:image/png;base64,${logoBytes.toString('base64')}`;
    if (sigBytes) base64Signature = `data:image/png;base64,${sigBytes.toString('base64')}`;
    if (stampBytes) base64Stamp = `data:image/png;base64,${stampBytes.toString('base64')}`;
  } catch (e) {
    console.error("Could not load local images:", e);
  }

  // Load profile picture if exists
  let base64ProfilePic = "";
  if (user.image) {
    try {
      if (user.image.startsWith("http")) {
        const res = await fetch(user.image);
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          const mimeType = res.headers.get("content-type") || "image/jpeg";
          base64ProfilePic = `data:${mimeType};base64,${Buffer.from(buffer).toString('base64')}`;
        }
      } else if (user.image.startsWith("/")) {
        // Local upload
        const imgPath = path.join(process.cwd(), "public", user.image);
        const bytes = await fs.readFile(imgPath);
        const ext = path.extname(imgPath).substring(1) || "jpeg";
        base64ProfilePic = `data:image/${ext};base64,${bytes.toString('base64')}`;
      }
    } catch (e) {
      console.error("Could not load profile picture:", e);
    }
  }

  const dobFormatted = user.dateOfBirth 
    ? user.dateOfBirth.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "2-digit",
      })
    : "N/A";

  const data = {
    studentName: user.name || "",
    fathersName: user.fatherName || "",
    residence: user.address || "",
    email: user.email || "",
    phone: user.whatsapp || "",
    dob: user.dateOfBirth ? dobFormatted : "",
    registrationNo: user.registrationNumber || "PENDING",
    profilePicUrl: base64ProfilePic || undefined,
    logoUrl: base64Logo,
    signatureUrl: base64Signature,
    stampUrl: base64Stamp,
  };

  const htmlString = renderIdCardToHtml(data);
  const pdfBuffer = await generatePdfFromHtml(htmlString, { 
    width: "1011px", 
    height: "638px" 
  });

  const filename = `ID_Card_${user.name?.replace(/\s+/g, '_') || "Student"}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
    },
  });
}
