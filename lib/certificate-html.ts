export function renderCertificateToHtml(data: {
  studentName: string;
  address: string;
  courseName: string;
  issueDate: string;
  signatureUrl: string;
  sealUrl: string;
  academyName: string;
  academyEmail: string;
  academyPhone: string;
}) {
  return `
<div
  class="w-[1123px] h-[794px] relative overflow-hidden bg-[#fdfaf3]"
  style="
    background:
      radial-gradient(circle at center, rgba(212,175,55,0.05), transparent 60%),
      #fdfaf3;
  "
>
  
  <!-- Outer Border -->
  <div class="absolute inset-4 border-[8px] border-[#d4af37] rounded-lg"></div>

  <!-- Inner Border -->
  <div class="absolute inset-8 border-2 border-[#0f3d2e] rounded-lg"></div>

  <!-- Watermark -->
  <div
    class="absolute inset-0 flex items-center justify-center opacity-[0.04]"
  >
    <img
      src="${data.sealUrl}"
      class="w-[450px]"
    />
  </div>

  <!-- Header -->
  <div class="pt-10 text-center relative z-10">
    
    <img
      src="${data.sealUrl}"
      class="w-24 h-24 mx-auto mb-4"
    />

    <h1
      class="text-5xl font-serif font-bold tracking-wide text-[#0f3d2e] uppercase"
    >
      ${data.academyName}
    </h1>

    <div class="w-48 h-[2px] bg-[#d4af37] mx-auto mt-4"></div>

    <h2
      class="text-6xl font-serif mt-8 text-[#b8860b]"
      style="letter-spacing:2px"
    >
      Certificate of Appreciation
    </h2>
  </div>

  <!-- Body -->
  <div class="px-24 mt-12 text-center relative z-10">
    
    <p class="text-2xl text-gray-700">
      This certificate is proudly presented to
    </p>

    <h3
      class="text-6xl font-bold mt-4 text-[#0f3d2e]"
      style="font-family: 'Georgia', 'Cormorant Garamond', serif;"
    >
      ${data.studentName}
    </h3>

    <div class="w-80 h-[2px] bg-[#d4af37] mx-auto my-5"></div>

    <p class="text-2xl text-gray-700 leading-relaxed">
      residing at
      <strong>${data.address}</strong>,
      in recognition and appreciation of their dedication,
      commitment, and sincere participation in Quranic learning
      at ${data.academyName}.
    </p>

    <p class="text-2xl text-gray-700 leading-relaxed mt-8">
      The student has shown admirable effort, discipline,
      and enthusiasm in the study of
      <strong>${data.courseName}</strong>
      reflecting excellent character and devotion
      to Islamic learning.
    </p>
  </div>

  <!-- Footer -->
  <div
    class="absolute bottom-16 left-20 right-20 flex justify-between items-end z-10"
  >
    
    <!-- Date -->
    <div>
      <p class="text-gray-600 text-lg">
        Date of Issuance
      </p>

      <p class="text-3xl font-semibold text-[#0f3d2e]">
        ${data.issueDate}
      </p>

      <div class="mt-8 text-gray-700 text-lg">
        <p>${data.academyEmail}</p>
        <p>${data.academyPhone}</p>
      </div>
    </div>

    <!-- Signature Area -->
    <div class="relative text-center">
      
      <img
        src="${data.signatureUrl}"
        class="w-[260px] relative z-20"
      />

      <img
        src="${data.sealUrl}"
        class="w-28 absolute left-[-60px] bottom-[-10px] opacity-90 z-10"
      />

      <div class="w-64 border-t border-[#d4af37] mt-2"></div>

      <p class="text-xl text-[#0f3d2e] mt-2">
        Signature Founder/CEO
      </p>
    </div>
  </div>

  <!-- Corner Decorations -->
  <div
    class="absolute top-0 left-0 w-40 h-40 border-t-[12px] border-l-[12px] border-[#0f3d2e]"
  ></div>

  <div
    class="absolute top-0 right-0 w-40 h-40 border-t-[12px] border-r-[12px] border-[#0f3d2e]"
  ></div>

  <div
    class="absolute bottom-0 left-0 w-40 h-40 border-b-[12px] border-l-[12px] border-[#0f3d2e]"
  ></div>

  <div
    class="absolute bottom-0 right-0 w-40 h-40 border-b-[12px] border-r-[12px] border-[#0f3d2e]"
  ></div>

</div>
`;
}
