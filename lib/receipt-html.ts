import { ReceiptData } from '@/types/receipt';
import { PROCESS_IMAGE_SCRIPT } from "./html-scripts";

export function renderReceiptToHtml(data: ReceiptData): string {
  const { academy, student, payment, authority, termsAndConditions } = data;
  const currencySymbol = payment.currency || '₹';

  const termsHtml = termsAndConditions
    .map(term => `<li>${term}</li>`)
    .join('');

  const stampHtml = authority.stampUrl
    ? `<img src="${authority.stampUrl}" alt="Official Stamp" class="w-24 absolute z-10 opacity-90 process-white-bg mix-blend-multiply" style="top: 50%; left: 50%; transform: translate(-50%, -50%);" />`
    : '';

  const signatureHtml = authority.signatureUrl
    ? `<img src="${authority.signatureUrl}" alt="Authorized Signature" class="max-h-[100px] max-w-[200px] object-contain relative z-20 translate-y-2 process-white-bg" />`
    : `<div class="h-[100px] w-full"></div>`;

  return `
    <div class="max-w-4xl mx-auto bg-white p-10 shadow-lg print:shadow-none print:p-0 text-slate-800 font-sans">
      <!-- Header Section -->
      <header class="flex justify-between items-center border-b-4 border-[#1a4d2e] pb-6 mb-8">
        <div class="relative w-32 h-32">
          <img src="${academy.logoUrl}" alt="${academy.name} Logo" class="object-contain w-full h-full process-white-bg" />
        </div>
        <div class="text-right">
          <h1 class="text-3xl font-serif font-bold text-[#1a4d2e] mb-2">${academy.name}</h1>
          <p class="text-sm text-slate-600">${academy.address}</p>
          <p class="text-sm text-slate-600">Phone: ${academy.phone} | Email: ${academy.email}</p>
          <p class="text-sm text-slate-600">Website: ${academy.website}</p>
        </div>
      </header>

      <!-- Receipt Title & Meta -->
      <div class="flex justify-between items-center mb-10">
        <h2 class="text-2xl font-bold tracking-widest text-[#1a4d2e] uppercase">Payment Receipt</h2>
        <div class="border border-slate-200 rounded bg-slate-50 overflow-hidden">
          <table class="text-sm">
            <tbody>
              <tr>
                <td class="px-4 py-2 font-semibold text-slate-600 border-r border-slate-200">Receipt ID</td>
                <td class="px-4 py-2 font-mono">${payment.receiptId}</td>
              </tr>
              <tr class="border-t border-slate-200">
                <td class="px-4 py-2 font-semibold text-slate-600 border-r border-slate-200">Date</td>
                <td class="px-4 py-2">${payment.date}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Info Grid -->
      <div class="grid grid-cols-2 gap-8 mb-10">
        <div class="bg-slate-50 border-l-4 border-[#1a4d2e] p-5">
          <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Received From</h3>
          <p class="font-bold text-lg text-slate-800 mb-1">${student.name}</p>
          <p class="text-slate-600 text-sm whitespace-pre-line">${student.address}</p>
          <p class="text-slate-600 text-sm mt-1">Phone: ${student.phone}</p>
        </div>

        <div class="bg-slate-50 border-l-4 border-[#1a4d2e] p-5 flex flex-col justify-center items-start relative overflow-hidden">
          <div class="relative z-10">
            <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">Payment Status</h3>
            <p class="text-sm text-slate-600 font-medium">
              Payment Method: <span class="font-bold text-slate-800">${payment.method}</span>
            </p>
          </div>
          
          <div class="absolute right-4 top-1/2 -translate-y-1/2 opacity-70">
            <div class="relative flex items-center justify-center w-28 h-28 rounded-full border-[3px] border-red-600">
              <div class="absolute inset-1 rounded-full border border-red-600 border-dashed"></div>
              <div class="absolute inset-2 rounded-full border border-red-600/20"></div>
              
              <div class="text-center font-bold text-red-600 flex flex-col items-center justify-center z-10">
                <span class="text-[7px] uppercase tracking-[0.15em] leading-tight mb-0.5">Darse Quran<br/>Academy</span>
                <span class="w-8 border-t-[1.5px] border-red-600 my-[3px]"></span>
                <span class="text-[9px] uppercase tracking-wider leading-tight">Payment<br/>Successful</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment Details Table -->
      <table class="w-full mb-12 border-collapse">
        <thead>
          <tr class="bg-[#1a4d2e] text-white text-left">
            <th class="py-3 px-4 font-semibold">Description</th>
            <th class="py-3 px-4 font-semibold text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b border-slate-200">
            <td class="py-4 px-4">
              <span class="font-bold block">${payment.courseName}</span>
              <span class="text-sm text-slate-500">Course / Enrollment Fee</span>
            </td>
            <td class="py-4 px-4 text-right font-mono text-lg text-slate-800">
              ${currencySymbol} ${(payment.baseAmount ?? payment.amount).toFixed(2)}
            </td>
          </tr>
          ${payment.gstAmount ? `
          <tr class="border-b border-slate-200">
            <td class="py-4 px-4 text-right text-sm text-slate-600">
              GST (18% inclusive)
            </td>
            <td class="py-4 px-4 text-right font-mono text-lg text-slate-800">
              ${currencySymbol} ${payment.gstAmount.toFixed(2)}
            </td>
          </tr>
          ` : ""}
          <tr class="bg-slate-50 border-y-2 border-[#1a4d2e]">
            <td class="py-4 px-4 text-right font-bold text-lg text-[#1a4d2e]">Total Amount Paid:</td>
            <td class="py-4 px-4 text-right font-bold font-mono text-xl text-[#1a4d2e]">
              ${currencySymbol} ${payment.amount.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Footer / Signatures -->
      <div class="flex justify-between items-end break-inside-avoid">
        <div class="w-3/5 pr-8">
          <h4 class="font-bold text-slate-800 mb-2">Terms & Conditions</h4>
          <ul class="list-disc pl-4 text-xs text-slate-500 space-y-1">
            ${termsHtml}
          </ul>
        </div>
        <div class="w-2/5 text-center flex flex-col items-center relative">
          <div class="relative flex justify-center items-center h-[120px] w-full">
            ${stampHtml}
            ${signatureHtml}
          </div>
          <div class="w-full border-t border-slate-300 pt-2 relative z-30">
            <p class="font-bold text-sm text-slate-800">${authority.name}</p>
            <p class="text-xs text-slate-500">${authority.designation}</p>
          </div>
        </div>
      </div>
    </div>
    <script>
      ${PROCESS_IMAGE_SCRIPT}
    </script>
  `;
}
