
export function renderCertificateToHtml(data: {
  studentName: string;
  address: string;
  courseName: string;
  issueDate: string;
  signatureUrl: string;
  sealUrl: string;
  stampUrl?: string;
  academyName: string;
  academyEmail: string;
  academyPhone: string;
  certificateNumber: string;
  certificateType?: string; // "APPRECIATION" or "COMPLETION"
  certificateGrade?: number | null; // 0-10
}) {
  const isCompletion = data.certificateType === "COMPLETION";
  const title = isCompletion ? "Certificate of Completion" : "Certificate of Appreciation";
  const gradeText = (isCompletion && data.certificateGrade != null) ? ` and has obtained a Grade of <strong class="text-brand-primary">${data.certificateGrade}/10</strong>` : "";

  return `
<link href="https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@400;700&family=Amiri:wght@400;700&display=swap" rel="stylesheet" />
<div
  class="w-pdf-cert-width h-pdf-cert-height relative overflow-hidden bg-surface-cream"
  style="
    background:
      radial-gradient(circle at center, rgba(212,175,55,0.05), transparent 60%),
      #fdfaf3;
  "
>
  
  <!-- Outer Border -->
  <div class="absolute inset-4 border-pdf-lg border-brand-gold rounded-lg"></div>

  <!-- Inner Border -->
  <div class="absolute inset-8 border-2 border-brand-primary rounded-lg"></div>

  <!-- Watermark -->
  <div
    class="absolute inset-0 flex items-center justify-center opacity-[0.04]"
  >
    <img
      src="${data.sealUrl}"
      class="w-[450px] process-white-bg"
    />
  </div>

  <!-- Header -->
  <div class="pt-14 relative z-10">
    <div class="flex items-center justify-center gap-6 max-w-[800px] mx-auto">
      <img
        src="${data.sealUrl}"
        class="w-20 h-20 process-white-bg flex-shrink-0"
        alt="Logo"
      />
  
      <div class="flex flex-col items-center">
        <h1
          class="text-pdf-34 font-serif font-bold tracking-wide text-brand-primary uppercase leading-tight"
        >
          ${data.academyName}
        </h1>
        
        <div class="flex items-center gap-4 mt-2">
           <div class="h-[2px] w-10 bg-brand-gold"></div>
           <h2 class="text-pdf-26 font-bold text-brand-primary" style="font-family: 'Scheherazade New', 'Amiri', serif; line-height: 1; word-spacing: 2px;">خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ</h2>
           <div class="h-[2px] w-10 bg-brand-gold"></div>
        </div>
      </div>
    </div>

    <div class="text-center mt-5">
      <h2
        class="text-pdf-44 font-serif text-gold-dark leading-tight"
        style="letter-spacing:2px"
      >
        ${title}
      </h2>
    </div>
  </div>

  <!-- Body -->
  <div class="px-16 mt-4 text-center relative z-10 flex flex-col items-center justify-center">
    
    <p class="text-pdf-20 text-gray-700">
      This certificate is proudly presented to
    </p>

    <h3
      class="text-pdf-44 font-bold mt-2 text-brand-primary leading-tight max-w-[900px] mx-auto"
      style="font-family: 'Georgia', 'Cormorant Garamond', serif;"
    >
      ${data.studentName}
    </h3>

    <div class="w-80 h-[2px] bg-brand-gold mx-auto my-3"></div>

    <p class="text-pdf-22 text-gray-700 leading-snug max-w-[950px] mx-auto">
      residing at
      <strong>${data.address}</strong>,
      in recognition of their commitment, diligence,
      and outstanding efforts in pursuing Islamic education
      at ${data.academyName}.
    </p>

    <p class="text-pdf-22 text-gray-700 leading-snug max-w-[950px] mx-auto mt-3">
      The student has demonstrated admirable effort, discipline,
      and enthusiasm throughout the successful completion of the
      <strong>${data.courseName}</strong> course${gradeText},
      reflecting excellent character, academic achievement, and devotion
      to Islamic learning.
    </p>
  </div>

  <!-- Footer -->
  <div
    class="absolute bottom-8 left-20 right-20 flex justify-between items-end z-10"
  >
    
    <!-- Date & Info -->
    <div>
      <div class="translate-y-4">
        <p class="text-sm text-gray-500 tracking-wide mb-1 font-mono">
          CERT NO: <span class="font-bold text-gray-800">${data.certificateNumber}</span>
        </p>

        <p class="text-gray-600 text-lg">
          Date of Issuance
        </p>

        <p class="text-pdf-28 font-semibold text-brand-primary">
          ${data.issueDate}
        </p>
      </div>

      <div class="mt-4 text-gray-700 text-pdf-16">
        <p>${data.academyEmail}</p>
        <p>${data.academyPhone}</p>
      </div>
    </div>

    <!-- Signature Area -->
    <div class="relative flex flex-col items-center w-64">
      
      <div class="relative flex justify-center items-center h-[110px] w-full">
        <!-- Stamp as background layer -->
        <img
          src="${data.stampUrl || data.sealUrl}"
          class="w-24 absolute z-10 opacity-90 process-white-bg mix-blend-multiply"
          style="top: 50%; left: 50%; transform: translate(-50%, -50%);"
        />
        <!-- Signature as foreground layer -->
        <img
          id="signature-image"
          src="${data.signatureUrl}"
          class="max-h-[110px] max-w-[240px] object-contain relative z-20 translate-y-1 process-white-bg"
        />
      </div>

      <div class="w-full border-t border-brand-gold mt-1"></div>

      <p class="text-lg text-brand-primary mt-1">
        Founder / CEO
      </p>
    </div>
  </div>

  <!-- Corner Decorations -->
  <div
    class="absolute top-0 left-0 w-40 h-40 border-t-pdf-xl border-l-pdf-xl border-brand-primary"
  ></div>

  <div
    class="absolute top-0 right-0 w-40 h-40 border-t-pdf-xl border-r-pdf-xl border-brand-primary"
  ></div>

  <div
    class="absolute bottom-0 left-0 w-40 h-40 border-b-pdf-xl border-l-pdf-xl border-brand-primary"
  ></div>

  <div
    class="absolute bottom-0 right-0 w-40 h-40 border-b-pdf-xl border-r-pdf-xl border-brand-primary"
  ></div>

</div>
`;
}
