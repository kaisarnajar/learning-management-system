import { ReceiptData } from '@/types/receipt';

export function renderReceiptToHtml(data: ReceiptData): string {
  const { academy, student, payment, authority, termsAndConditions } = data;
  const currencySymbol = payment.currency || '₹';

  const termsHtml = termsAndConditions
    .map(term => `<li>${term}</li>`)
    .join('');

  const stampHtml = authority.stampUrl
    ? `<img src="${authority.stampUrl}" alt="Official Stamp" class="h-16 mb-[-20px] opacity-50 absolute mix-blend-multiply" />`
    : '';

  const signatureHtml = authority.signatureUrl
    ? `<img src="${authority.signatureUrl}" alt="Authorized Signature" class="h-16 object-contain mb-2 relative z-10" />`
    : `<div class="h-16 mb-2"></div>`;

  return `
    <div class="max-w-4xl mx-auto bg-white p-10 shadow-lg print:shadow-none print:p-0 text-slate-800 font-sans">
      <!-- Header Section -->
      <header class="flex justify-between items-center border-b-4 border-[#1a4d2e] pb-6 mb-8">
        <div class="relative w-32 h-32">
          <img src="${academy.logoUrl}" alt="${academy.name} Logo" class="object-contain w-full h-full" />
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

        <div class="bg-slate-50 border-l-4 border-[#1a4d2e] p-5 flex flex-col justify-center items-start">
          <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Payment Status</h3>
          <div class="inline-block border-4 border-red-500 text-red-500 text-xl font-bold px-4 py-1 rounded -rotate-6 tracking-widest opacity-80 mb-3">
            SUCCESSFUL
          </div>
          <p class="text-sm text-slate-600">
            Payment Method: <span class="font-semibold">${payment.method}</span>
          </p>
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
              ${currencySymbol} ${payment.amount.toFixed(2)}
            </td>
          </tr>
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
          ${stampHtml}
          ${signatureHtml}
          <div class="w-full border-t border-slate-300 pt-2 relative z-10">
            <p class="font-bold text-sm text-slate-800">${authority.name}</p>
            <p class="text-xs text-slate-500">${authority.designation}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}
