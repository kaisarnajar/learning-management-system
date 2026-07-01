import { PROCESS_IMAGE_SCRIPT } from "./html-scripts";

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

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cormorant+Garamond:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', sans-serif;
    }
  </style>
</head>
<body>
  <div style="zoom: 0.32;">
    <div
      class="w-[1011px] h-[638px] relative overflow-hidden bg-[#fdfaf3] text-[#0f3d2e] box-border border-[6px] border-[#0f3d2e] rounded-[36px] shadow-2xl"
      style="background: #fcf9f2;"
    >
      <!-- Top Decorative Corners (Abstract curves) -->
      <div class="absolute top-0 right-0 w-[400px] h-[200px] overflow-hidden pointer-events-none rounded-tr-[28px]">
         <svg viewBox="0 0 400 200" class="w-full h-full" preserveAspectRatio="none">
           <path d="M0,0 L400,0 L400,200 C300,50 150,0 0,0 Z" fill="#0f3d2e" opacity="1" />
           <path d="M50,0 L400,0 L400,150 C300,20 200,0 50,0 Z" fill="#d4af37" opacity="1" />
         </svg>
      </div>
      <div class="absolute bottom-0 left-0 w-[400px] h-[200px] overflow-hidden pointer-events-none transform rotate-180 rounded-tr-[28px]">
         <svg viewBox="0 0 400 200" class="w-full h-full" preserveAspectRatio="none">
           <path d="M0,0 L400,0 L400,200 C300,50 150,0 0,0 Z" fill="#0f3d2e" opacity="1" />
         </svg>
      </div>

      <!-- Main Content Container (2 columns) -->
      <div class="flex w-full h-full px-8 pt-6 pb-[52px] relative z-10 gap-8">
        
        <!-- LEFT COLUMN -->
        <div class="w-[250px] flex flex-col items-center flex-shrink-0">
          <!-- Logo -->
          <img src="${data.logoUrl}" class="w-[130px] h-[130px] object-contain mb-3" alt="Logo" />
          
          <!-- Photo -->
          <div class="w-[230px] h-[270px] border-[4px] border-[#0f3d2e] rounded-t-xl bg-white overflow-hidden relative shadow-md">
            ${profileContent}
          </div>
          <!-- Banner -->
          <div class="w-[230px] bg-[#0f3d2e] text-white text-center py-2 rounded-b-xl border-[4px] border-t-0 border-[#0f3d2e] font-bold text-[22px] tracking-wider shadow-md">
            STUDENT CARD
          </div>

          <!-- Stamp & Signature -->
          <div class="mt-4 flex flex-col items-center relative w-[230px]">
             <div class="relative w-full h-[85px] flex justify-center items-center">
               <img src="${data.stampUrl}" class="absolute h-[110px] opacity-70 pointer-events-none" style="top: -15px;" alt="Stamp" />
               <img src="${data.signatureUrl}" class="absolute h-[70px] z-10" style="bottom: 0px;" alt="Signature" />
             </div>
             <div class="w-48 h-[2px] bg-[#d4af37] mt-1"></div>
             <p class="text-[17px] font-semibold text-[#0f3d2e] mt-1 tracking-wide">Founder / CEO</p>
          </div>
        </div>

        <!-- RIGHT COLUMN -->
        <div class="flex-1 flex flex-col pt-2 pr-4">
          <!-- Title Section -->
          <div class="flex flex-col items-center mb-6 relative">
            <h1 class="text-[46px] font-serif font-bold text-[#0f3d2e] tracking-wider uppercase mb-1 whitespace-nowrap">
              DARSE QURAN ACADEMY
            </h1>
            
            <div class="flex items-center gap-4 mb-4">
               <div class="h-[2px] w-12 bg-[#d4af37]"></div>
               <h2 class="text-[34px] font-bold text-[#0f3d2e]" style="font-family: 'Amiri', 'Traditional Arabic', serif; line-height: 1;">خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ</h2>
               <div class="h-[2px] w-12 bg-[#d4af37]"></div>
            </div>
            
            <div class="bg-[#0f3d2e] text-white px-8 py-2.5 rounded-lg flex items-center gap-4 shadow-md">
              <span class="text-[22px] font-bold tracking-wide">REGISTRATION NO.</span>
              <div class="w-[2px] h-6 bg-[#d4af37]"></div>
              <span class="text-[22px] font-bold tracking-wide">${data.registrationNo || "PENDING"}</span>
            </div>
          </div>

          <!-- Details Table -->
          <div class="flex flex-col flex-1 justify-center pb-4 pl-2">
            
            <div class="flex flex-col mb-[16px]">
              <div class="flex items-start">
                <span class="text-[22px] font-bold text-[#0f3d2e] w-[180px] shrink-0">Name</span>
                <span class="text-[22px] font-bold text-[#0f3d2e] mx-3">:</span>
                <span class="text-[22px] text-gray-800 font-medium leading-tight">${data.studentName}</span>
              </div>
              <div class="h-[1.5px] w-full bg-[#d4af37]/80 mt-[8px]"></div>
            </div>

            <div class="flex flex-col mb-[16px]">
              <div class="flex items-start">
                <span class="text-[22px] font-bold text-[#0f3d2e] w-[180px] shrink-0">Father's Name</span>
                <span class="text-[22px] font-bold text-[#0f3d2e] mx-3">:</span>
                <span class="text-[22px] text-gray-800 font-medium leading-tight">${data.fathersName}</span>
              </div>
              <div class="h-[1.5px] w-full bg-[#d4af37]/80 mt-[8px]"></div>
            </div>

            <div class="flex flex-col mb-[16px]">
              <div class="flex items-start">
                <span class="text-[22px] font-bold text-[#0f3d2e] w-[180px] shrink-0">Residence</span>
                <span class="text-[22px] font-bold text-[#0f3d2e] mx-3">:</span>
                <span class="text-[20px] text-gray-800 font-medium leading-snug">${data.residence}</span>
              </div>
              <div class="h-[1.5px] w-full bg-[#d4af37]/80 mt-[8px]"></div>
            </div>

            <div class="flex flex-col mb-[16px]">
              <div class="flex items-start">
                <span class="text-[22px] font-bold text-[#0f3d2e] w-[180px] shrink-0">Email</span>
                <span class="text-[22px] font-bold text-[#0f3d2e] mx-3">:</span>
                <span class="text-[22px] text-gray-800 font-medium leading-tight">${data.email}</span>
              </div>
              <div class="h-[1.5px] w-full bg-[#d4af37]/80 mt-[8px]"></div>
            </div>

            <div class="flex flex-col mb-[16px]">
              <div class="flex items-start">
                <span class="text-[22px] font-bold text-[#0f3d2e] w-[180px] shrink-0">Phone</span>
                <span class="text-[22px] font-bold text-[#0f3d2e] mx-3">:</span>
                <span class="text-[22px] text-gray-800 font-medium leading-tight">${data.phone}</span>
              </div>
              <div class="h-[1.5px] w-full bg-[#d4af37]/80 mt-[8px]"></div>
            </div>

            <div class="flex flex-col">
              <div class="flex items-start">
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
      <div class="absolute bottom-0 left-0 h-[52px] bg-[#0f3d2e] w-full z-20 flex items-center px-12 justify-start border-t-[4px] border-[#d4af37] gap-3 rounded-b-[28px]">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        <div class="w-[1.5px] h-6 bg-white/50"></div>
        <span class="text-white font-medium tracking-wider text-[20px]">darsequranacademy.com</span>
      </div>

    </div>
  </div>
</body>
</html>
  `;
}
