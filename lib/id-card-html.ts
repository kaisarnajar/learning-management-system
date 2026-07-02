import { PROCESS_IMAGE_SCRIPT } from "./html-scripts";
import { resolveUserRole } from "@/lib/teacher-auth";
import { generatePdfFromHtml } from "@/lib/pdf-generator";
import fs from "fs/promises";
import path from "path";

export function renderIdCardToHtml(data: {
  studentName: string;
  fathersName: string;
  residence: string;
  email: string;
  phone: string;
  dob: string;
  registrationNo: string;
  profilePicUrl?: string;
  logoUrl: string;
  signatureUrl: string;
  stampUrl: string;
  base64Font?: string;
  role?: string;
}) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const profileContent = data.profilePicUrl
    ? `<img src="${data.profilePicUrl}" class="w-full h-full object-cover rounded-t-lg" />`
    : `<div class="w-full h-full flex flex-col items-center justify-center bg-[#0f3d2e]/10 text-[#0f3d2e] rounded-t-lg">
         <span class="text-7xl font-bold font-serif">${getInitials(data.studentName)}</span>
         <span class="text-lg mt-2 font-medium opacity-60">No Photo Available</span>
       </div>`;

  let cardRole = "STUDENT";
  if (data.role && data.role !== "USER") {
    cardRole = data.role.toUpperCase();
    if (cardRole === "DEVELOPER") {
      cardRole = "ADMIN";
    }
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@400;700&family=Amiri:wght@400;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    ${data.base64Font ? `
    @font-face {
      font-family: 'IndoPak';
      src: url('${data.base64Font}') format('woff2');
      font-weight: 400;
      font-style: normal;
    }
    ` : ""}
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', sans-serif;
    }
  </style>
</head>
<body>
  <div>
    <div
      class="w-[1011px] h-[638px] relative overflow-hidden bg-[#fdfaf3] text-[#0f3d2e] box-border border-[6px] border-[#0f3d2e] rounded-[36px] shadow-2xl"
      style="background: #fcf9f2;"
    >
      <!-- Top Decorative Corners (Abstract curves) -->
      <div class="absolute top-0 right-0 w-[250px] h-[125px] overflow-hidden pointer-events-none rounded-tr-[28px]">
         <svg viewBox="0 0 400 200" class="w-full h-full" preserveAspectRatio="none">
           <path d="M0,0 L400,0 L400,200 C300,50 150,0 0,0 Z" fill="#0f3d2e" opacity="1" />
           <path d="M50,0 L400,0 L400,150 C300,20 200,0 50,0 Z" fill="#d4af37" opacity="1" />
         </svg>
      </div>
      <div class="absolute bottom-0 left-0 w-[250px] h-[125px] overflow-hidden pointer-events-none transform rotate-180 rounded-tr-[28px]">
         <svg viewBox="0 0 400 200" class="w-full h-full" preserveAspectRatio="none">
           <path d="M0,0 L400,0 L400,200 C300,50 150,0 0,0 Z" fill="#0f3d2e" opacity="1" />
         </svg>
      </div>

      <!-- Main Content Container (2 columns) -->
      <div class="flex w-full h-full px-8 pt-6 pb-[52px] relative z-10 gap-8">
        
        <!-- LEFT COLUMN -->
        <div class="w-[250px] flex flex-col items-center flex-shrink-0">
          <!-- Logo -->
          <img src="${data.logoUrl}" class="w-[130px] h-[130px] object-contain mb-3 process-white-bg" alt="Logo" />
          
          <!-- Photo -->
          <div class="w-[230px] h-[270px] border-[4px] border-[#0f3d2e] rounded-t-xl bg-white overflow-hidden relative shadow-md">
            ${profileContent}
          </div>
          <!-- Banner -->
          <div class="w-[230px] bg-[#0f3d2e] text-white text-center py-2 rounded-b-xl border-[4px] border-t-0 border-[#0f3d2e] font-bold text-[22px] tracking-wider shadow-md">
            ${cardRole} CARD
          </div>

          <!-- Stamp & Signature -->
          <div class="mt-4 flex flex-col items-center relative w-[230px]">
             <div class="relative flex justify-center items-center h-[85px] w-full">
               <!-- Stamp as background layer -->
               <img src="${data.stampUrl}" class="w-20 absolute z-10 opacity-90 process-white-bg mix-blend-multiply" style="top: 50%; left: 50%; transform: translate(-50%, -50%);" alt="Stamp" />
               <!-- Signature as foreground layer -->
               <img src="${data.signatureUrl}" class="max-h-[85px] max-w-[150px] object-contain relative z-20 translate-y-1 process-white-bg" alt="Signature" />
             </div>
             <div class="w-48 h-[2px] bg-[#d4af37] mt-1"></div>
             <p class="text-[17px] font-semibold text-[#0f3d2e] mt-1 tracking-wide">Founder / CEO</p>
          </div>
        </div>

        <!-- RIGHT COLUMN -->
        <div class="flex-1 flex flex-col pt-2 pr-4">
          <!-- Title Section -->
          <div class="flex flex-col items-center mb-6 relative">
            <div class="flex flex-col items-center relative -left-6">
              <h1 class="text-[46px] font-serif font-bold text-[#0f3d2e] tracking-wider uppercase mb-1 whitespace-nowrap">
                DARSE QURAN ACADEMY
              </h1>
              
              <div class="flex items-center gap-4 mb-4">
                 <div class="h-[2px] w-12 bg-[#d4af37]"></div>
                 <h2 class="text-[38px] font-bold text-[#0f3d2e]" style="font-family: 'IndoPak', 'Scheherazade New', 'Amiri', serif; line-height: 1; word-spacing: 2px;">خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ</h2>
                 <div class="h-[2px] w-12 bg-[#d4af37]"></div>
              </div>
            </div>
            
            <div class="bg-[#0f3d2e] text-white px-8 py-2.5 rounded-lg flex items-center gap-4 shadow-md">
              <span class="text-[22px] font-bold tracking-wide">REGISTRATION NO.</span>
              <div class="w-[2px] h-6 bg-[#d4af37]"></div>
              <span class="text-[22px] font-bold tracking-wide">${data.registrationNo || "PENDING"}</span>
            </div>
          </div>

          <!-- Details Table -->
          <div class="flex flex-col flex-1 justify-center pb-6 pl-2">
            
            <div class="flex flex-col mb-[12px]">
              <div class="flex items-baseline">
                <span class="text-[22px] font-bold text-[#0f3d2e] w-[180px] shrink-0">Name</span>
                <span class="text-[22px] font-bold text-[#0f3d2e] mx-3">:</span>
                <span class="text-[22px] text-gray-800 font-medium leading-tight">${data.studentName}</span>
              </div>
              <div class="h-[1.5px] w-full bg-[#d4af37]/80 mt-[8px]"></div>
            </div>

            <div class="flex flex-col mb-[12px]">
              <div class="flex items-baseline">
                <span class="text-[22px] font-bold text-[#0f3d2e] w-[180px] shrink-0">Father's Name</span>
                <span class="text-[22px] font-bold text-[#0f3d2e] mx-3">:</span>
                <span class="text-[22px] text-gray-800 font-medium leading-tight">${data.fathersName}</span>
              </div>
              <div class="h-[1.5px] w-full bg-[#d4af37]/80 mt-[8px]"></div>
            </div>

            <div class="flex flex-col mb-[12px]">
              <div class="flex items-baseline">
                <span class="text-[22px] font-bold text-[#0f3d2e] w-[180px] shrink-0">Residence</span>
                <span class="text-[22px] font-bold text-[#0f3d2e] mx-3">:</span>
                <span class="text-[20px] text-gray-800 font-medium leading-snug">${data.residence}</span>
              </div>
              <div class="h-[1.5px] w-full bg-[#d4af37]/80 mt-[8px]"></div>
            </div>

            <div class="flex flex-col mb-[12px]">
              <div class="flex items-baseline">
                <span class="text-[22px] font-bold text-[#0f3d2e] w-[180px] shrink-0">Email</span>
                <span class="text-[22px] font-bold text-[#0f3d2e] mx-3">:</span>
                <span class="text-[22px] text-gray-800 font-medium leading-tight">${data.email}</span>
              </div>
              <div class="h-[1.5px] w-full bg-[#d4af37]/80 mt-[8px]"></div>
            </div>

            <div class="flex flex-col mb-[12px]">
              <div class="flex items-baseline">
                <span class="text-[22px] font-bold text-[#0f3d2e] w-[180px] shrink-0">Phone</span>
                <span class="text-[22px] font-bold text-[#0f3d2e] mx-3">:</span>
                <span class="text-[22px] text-gray-800 font-medium leading-tight">${data.phone}</span>
              </div>
              <div class="h-[1.5px] w-full bg-[#d4af37]/80 mt-[8px]"></div>
            </div>

            <div class="flex flex-col">
              <div class="flex items-baseline">
                <span class="text-[22px] font-bold text-[#0f3d2e] w-[180px] shrink-0">Date of Birth</span>
                <span class="text-[22px] font-bold text-[#0f3d2e] mx-3">:</span>
                <span class="text-[22px] text-gray-800 font-medium leading-tight">${data.dob}</span>
              </div>
              <div class="h-[1.5px] w-full bg-[#d4af37]/80 mt-[8px]"></div>
            </div>

          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="absolute bottom-0 left-0 h-[52px] bg-[#0f3d2e] w-full z-20 flex items-center justify-center border-t-[4px] border-[#d4af37] gap-3 rounded-b-[28px]">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        <div class="w-[1.5px] h-6 bg-white/50"></div>
        <span class="text-white font-medium tracking-wider text-[20px]">darsequranacademy.com</span>
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

export async function generateIdCardPdf(user: {
  name: string | null;
  fatherName: string | null;
  address: string | null;
  email: string;
  whatsapp: string | null;
  dateOfBirth: Date | null;
  registrationNumber: string | null;
  image: string | null;
}): Promise<Buffer> {
  const targetRole = await resolveUserRole(user.email);

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
        // Upgrade Google profile picture resolution
        if (imageUrl.includes("googleusercontent.com")) {
          imageUrl = imageUrl.replace(/=s\d+-c/g, "=s1000-c");
        }
        
        const res = await fetch(imageUrl);
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          const mimeType = res.headers.get("content-type") || "image/jpeg";
          base64ProfilePic = `data:${mimeType};base64,${Buffer.from(buffer).toString('base64')}`;
        }
      } else if (imageUrl.startsWith("/")) {
        // Local upload
        const imgPath = path.join(process.cwd(), "public", imageUrl);
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

  return pdfBuffer;
}
