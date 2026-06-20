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
  certificateNumber: string;
  certificateType?: string; // "APPRECIATION" or "COMPLETION"
  certificateGrade?: number | null; // 0-10
}) {
  const isCompletion = data.certificateType === "COMPLETION";
  const title = isCompletion ? "Certificate of Completion" : "Certificate of Appreciation";
  const gradeText = (isCompletion && data.certificateGrade != null) ? `, and has obtained ${data.certificateGrade}/10` : "";

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
      class="w-[450px] process-white-bg"
    />
  </div>

  <!-- Header -->
  <div class="pt-8 text-center relative z-10">
    
    <img
      src="${data.sealUrl}"
      class="w-20 h-20 mx-auto mb-3 process-white-bg"
    />

    <h1
      class="text-[40px] font-serif font-bold tracking-wide text-[#0f3d2e] uppercase"
    >
      ${data.academyName}
    </h1>

    <div class="w-48 h-[2px] bg-[#d4af37] mx-auto mt-3"></div>

    <h2
      class="text-[52px] font-serif mt-5 text-[#b8860b]"
      style="letter-spacing:2px"
    >
      ${title}
    </h2>
  </div>

  <!-- Body -->
  <div class="px-24 mt-6 text-center relative z-10">
    
    <p class="text-xl text-gray-700">
      This certificate is proudly presented to
    </p>

    <h3
      class="text-5xl font-bold mt-3 text-[#0f3d2e]"
      style="font-family: 'Georgia', 'Cormorant Garamond', serif;"
    >
      ${data.studentName}
    </h3>

    <div class="w-80 h-[2px] bg-[#d4af37] mx-auto my-4"></div>

    <p class="text-[22px] text-gray-700 leading-snug">
      residing at
      <strong>${data.address}</strong>,
      in recognition and appreciation of their dedication,
      commitment, and sincere participation in Quranic learning
      at ${data.academyName}.
    </p>

    <p class="text-[22px] text-gray-700 leading-snug mt-5">
      The student has shown admirable effort, discipline,
      and enthusiasm in the study of
      <strong>${data.courseName}</strong>${gradeText},
      reflecting excellent character and devotion
      to Islamic learning.
    </p>
  </div>

  <!-- Footer -->
  <div
    class="absolute bottom-12 left-20 right-20 flex justify-between items-end z-10"
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

        <p class="text-[28px] font-semibold text-[#0f3d2e]">
          ${data.issueDate}
        </p>
      </div>

      <div class="mt-4 text-gray-700 text-[16px]">
        <p>${data.academyEmail}</p>
        <p>${data.academyPhone}</p>
      </div>
    </div>

    <!-- Signature Area -->
    <div class="relative flex flex-col items-center w-64">
      
      <div class="relative flex justify-center items-end h-[100px] w-full">
        <img
          id="signature-image"
          src="${data.signatureUrl}"
          class="max-h-[140px] max-w-[240px] object-contain relative z-20 translate-y-4 process-white-bg"
        />
        <img
          src="${data.sealUrl}"
          class="w-24 absolute left-[-40px] bottom-[-10px] opacity-80 z-10 process-white-bg"
        />
      </div>

      <div class="w-full border-t border-[#d4af37] mt-2"></div>

      <p class="text-lg text-[#0f3d2e] mt-2">
        Founder / CEO
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

  <script>
    window.addEventListener('load', () => {
      const imgs = document.querySelectorAll('.process-white-bg');
      
      imgs.forEach((img) => {
        if (!img.src || img.src.length < 100) return;

        const processImage = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width || 400;
            canvas.height = img.naturalHeight || img.height || 200;
            const ctx = canvas.getContext('2d');
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i+1];
              const b = data[i+2];
              // Remove white/light pixels
              if (r > 200 && g > 200 && b > 200) {
                data[i+3] = 0; // Transparent
              }
            }
            
            ctx.putImageData(imageData, 0, 0);
            img.src = canvas.toDataURL('image/png');
          } catch (e) {
            console.error("Canvas processing failed", e);
          }
        };

        if (img.complete) {
          processImage();
        } else {
          img.onload = processImage;
        }
      });
    });
  </script>

</div>
`;
}
