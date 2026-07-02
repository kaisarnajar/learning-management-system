"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderIdCardToHtml } from "@/lib/id-card-html";
import { generatePdfFromHtml } from "@/lib/pdf-generator";
import { sendIdCardEmail } from "@/lib/email";
import { resolveUserRole } from "@/lib/teacher-auth";
import fs from "fs/promises";
import path from "path";

export async function sendIdCardToEmailAction(targetUserId?: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "DEVELOPER")) {
      return { error: "Unauthorized. Admin access required." };
    }

    if (!targetUserId) {
      return { error: "targetUserId is required." };
    }

    const idToFetch = targetUserId;

    const user = await prisma.user.findUnique({
      where: { id: idToFetch },
    });

    if (!user) {
      return { error: "User not found." };
    }
    
    const targetRole = await resolveUserRole(user.email);
    
    if (!user.email) {
      return { error: "No email address found for this user." };
    }

    // Load static assets
    let base64Logo = "";
    let base64Signature = "";
    let base64Stamp = "";
    let base64Font = "";
    
    try {
      const logoPath = path.join(process.cwd(), "public", "assets", "logo.png");
      const sigPath = path.join(process.cwd(), "public", "assets", "signature.png");
      const stampPath = path.join(process.cwd(), "public", "assets", "stamp.png");
      const fontPath = path.join(process.cwd(), "public", "fonts", "indopak-nastaleeq.woff2");
      
      const [logoBytes, sigBytes, stampBytes, fontBytes] = await Promise.all([
        fs.readFile(logoPath).catch(() => null),
        fs.readFile(sigPath).catch(() => null),
        fs.readFile(stampPath).catch(() => null),
        fs.readFile(fontPath).catch(() => null),
      ]);
      
      if (logoBytes) base64Logo = `data:image/png;base64,${logoBytes.toString('base64')}`;
      if (sigBytes) base64Signature = `data:image/png;base64,${sigBytes.toString('base64')}`;
      if (stampBytes) base64Stamp = `data:image/png;base64,${stampBytes.toString('base64')}`;
      if (fontBytes) base64Font = `data:font/woff2;charset=utf-8;base64,${fontBytes.toString('base64')}`;
    } catch (e) {
      console.error("Could not load local images:", e);
    }

    // Load profile picture if exists
    let base64ProfilePic = "";
    if (user.image) {
      try {
        let imageUrl = user.image;
        if (imageUrl.startsWith("http")) {
          if (imageUrl.includes("googleusercontent.com")) {
            imageUrl = imageUrl.replace(/=s\d+-c/g, "=s1000-c");
          }
          const res = await fetch(imageUrl);
          if (res.ok) {
            const buffer = await res.arrayBuffer();
            const mimeType = res.headers.get("content-type") || "image/jpeg";
            base64ProfilePic = `data:${mimeType};base64,${Buffer.from(buffer).toString('base64')}`;
          }
        } else if (user.image.startsWith("/")) {
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
      base64Font: base64Font,
      role: targetRole,
    };

    const htmlString = renderIdCardToHtml(data);
    const pdfBuffer = await generatePdfFromHtml(htmlString, { 
      width: "1011px", 
      height: "638px" 
    });

    const filename = `ID_Card_${user.name?.replace(/\s+/g, '_') || "Student"}.pdf`;

    const emailResult = await sendIdCardEmail({
      to: user.email,
      studentName: user.name || "Student",
      pdfBuffer: Buffer.from(pdfBuffer),
      pdfFilename: filename,
    });

    if (emailResult.sent) {
      return { success: true };
    } else {
      return { error: emailResult.error || "Failed to send email." };
    }
  } catch (error) {
    console.error("sendIdCardToEmailAction error:", error);
    return { error: "An unexpected error occurred while generating or sending the ID card." };
  }
}
