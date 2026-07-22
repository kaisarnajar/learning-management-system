import { ReceiptData } from '@/types/receipt';

import { BRAND_CONFIG } from "@/config/brand";

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
    <div class="p-4 sm:p-6 flex justify-center bg-white w-full">
      <div class="max-w-4xl mx-auto bg-white p-6 sm:p-8 shadow-none print:p-0 text-slate-800 font-sans w-full">
        <!-- Header Section -->
      <header class="flex justify-between items-center border-b-4 border-brand-primary-light pb-5 mb-6" style="border-color: #1a4d2e;">
        <div class="relative w-28 h-28">
          <img src="${academy.logoUrl}" alt="${academy.name} Logo" class="object-contain w-full h-full process-white-bg" />
        </div>
        <div class="text-right">
          <h1 class="text-3xl font-serif font-bold text-brand-primary-light mb-1" style="color: #1a4d2e;">${academy.name}</h1>
          <p class="text-xs sm:text-sm text-slate-600">${academy.address}</p>
          <p class="text-xs sm:text-sm text-slate-600">Phone: ${academy.phone} | Email: ${academy.email}</p>
          <p class="text-xs sm:text-sm text-slate-600">Website: ${academy.website}</p>
        </div>
      </header>

      <!-- Receipt Title & Meta -->
      <div class="flex justify-between items-center mb-8">
        <h2 class="text-2xl font-bold tracking-widest text-brand-primary-light uppercase" style="color: #1a4d2e;">Payment Receipt</h2>
        <div class="border border-slate-200 rounded bg-slate-50 overflow-hidden">
          <table class="text-sm">
            <tbody>
              <tr>
                <td class="px-4 py-1.5 font-semibold text-slate-600 border-r border-slate-200">Receipt ID</td>
                <td class="px-4 py-1.5 font-mono">${payment.receiptId}</td>
              </tr>
              <tr class="border-t border-slate-200">
                <td class="px-4 py-1.5 font-semibold text-slate-600 border-r border-slate-200">Date</td>
                <td class="px-4 py-1.5">${payment.date}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Info Grid -->
      <div class="grid grid-cols-2 gap-6 mb-8">
        <div class="bg-slate-50 border-l-4 border-brand-primary-light p-4 rounded-r" style="border-color: #1a4d2e;">
          <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Received From</h3>
          <p class="font-bold text-base text-slate-800 mb-1">${student.name}</p>
          <p class="text-slate-600 text-sm whitespace-pre-line">${student.address}</p>
          <p class="text-slate-600 text-sm mt-1">Phone: ${student.phone}</p>
        </div>

        <div class="bg-slate-50 border-l-4 border-brand-primary-light p-4 rounded-r flex flex-col justify-center items-start relative overflow-hidden" style="border-color: #1a4d2e;">
          <div class="relative z-10">
            <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Payment Status</h3>
            <p class="text-sm text-slate-600 font-medium">
              Payment Method: <span class="font-bold text-slate-800">${payment.method}</span>
            </p>
            ${payment.amount === 0 ? `<p class="text-xs text-emerald-700 font-bold uppercase mt-1">100% Fee Waived Off</p>` : ''}
          </div>
          
          <div class="absolute right-4 top-1/2 -translate-y-1/2 opacity-80">
            <div class="relative flex items-center justify-center w-24 h-24 rounded-full border-pdf-xs border-red-600">
              <div class="absolute inset-1 rounded-full border border-red-600 border-dashed"></div>
              <div class="absolute inset-2 rounded-full border border-red-600/20"></div>
              
              <div class="text-center font-bold text-red-600 flex flex-col items-center justify-center z-10">
                <span class="text-pdf-7 uppercase tracking-[0.15em] leading-tight mb-0.5">Darse Quran<br/>Academy</span>
                <span class="w-7 border-t-pdf-hairline border-red-600 my-[2px]"></span>
                <span class="text-pdf-9 uppercase tracking-wider leading-tight">${payment.amount === 0 ? 'Waiver<br/>Granted' : 'Payment<br/>Successful'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment Details Table -->
      <table class="w-full mb-8 border-collapse">
        <thead>
          <tr class="bg-brand-primary-light text-white text-left" style="background-color: #1a4d2e; color: #ffffff;">
            <th class="py-2.5 px-4 font-semibold">Description</th>
            <th class="py-2.5 px-4 font-semibold text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b border-slate-200">
            <td class="py-3 px-4">
              <span class="font-bold block text-slate-800">${payment.courseName}</span>
              <span class="text-xs text-slate-500">${payment.typeLabel || (payment.courseName === 'Book Order' ? 'Books' : 'Course / Enrollment Fee')}</span>
              ${payment.discountPercentage ? `<span class="inline-block mt-1 bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">${payment.discountPercentage}% Fee Waived Off</span>` : (payment.amount === 0 ? `<span class="inline-block mt-1 bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">100% Fee Waived Off</span>` : '')}
            </td>
            <td class="py-3 px-4 text-right font-mono text-base text-slate-800">
              ${currencySymbol} ${(payment.originalAmount ?? (payment.baseAmount ?? (payment.amount - (payment.shippingAmount || 0)))).toFixed(2)}
            </td>
          </tr>
          ${payment.discountAmount ? `
          <tr class="border-b border-slate-200 bg-emerald-50/40">
            <td class="py-2.5 px-4 text-right text-xs font-semibold text-emerald-800">
              Fee Waiver / Discount (${payment.discountPercentage}% OFF)
            </td>
            <td class="py-2.5 px-4 text-right font-mono text-sm font-semibold text-emerald-700">
              - ${currencySymbol} ${payment.discountAmount.toFixed(2)}
            </td>
          </tr>
          ` : ""}
          ${payment.shippingAmount ? `
          <tr class="border-b border-slate-200">
            <td class="py-3 px-4 text-right text-xs text-slate-600">
              Shipping Charges
            </td>
            <td class="py-3 px-4 text-right font-mono text-base text-slate-800">
              ${currencySymbol} ${payment.shippingAmount.toFixed(2)}
            </td>
          </tr>
          ` : ""}
          ${payment.gstAmount ? `
          <tr class="border-b border-slate-200">
            <td class="py-3 px-4 text-right text-xs text-slate-600">
              GST (18% inclusive)
            </td>
            <td class="py-3 px-4 text-right font-mono text-base text-slate-800">
              ${currencySymbol} ${payment.gstAmount.toFixed(2)}
            </td>
          </tr>
          ` : ""}
          <tr class="bg-slate-50 border-y-2 border-brand-primary-light" style="border-color: #1a4d2e;">
            <td class="py-3 px-4 text-right font-bold text-base text-brand-primary-light" style="color: #1a4d2e;">Grand Total:</td>
            <td class="py-3 px-4 text-right font-bold font-mono text-lg text-brand-primary-light" style="color: #1a4d2e;">
              ${currencySymbol} ${payment.amount.toFixed(2)}
              ${payment.amount === 0 ? `<div class="text-xs text-emerald-700 font-bold uppercase mt-0.5 font-sans">(100% Waived Off)</div>` : ''}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Footer / Signatures -->
      <div class="flex justify-between items-end break-inside-avoid">
        <div class="w-3/5 pr-6">
          <h4 class="font-bold text-slate-800 text-xs mb-1.5">Terms & Conditions</h4>
          <ul class="list-disc pl-4 text-pdf-10 text-slate-500 space-y-0.5">
            ${termsHtml}
          </ul>
        </div>
        <div class="w-2/5 text-center flex flex-col items-center relative">
          <div class="relative flex justify-center items-center h-[90px] w-full">
            ${stampHtml}
            ${signatureHtml}
          </div>
          <div class="w-full border-t border-slate-300 pt-1.5 relative z-30">
            <p class="font-bold text-xs text-slate-800">${authority.name}</p>
            <p class="text-pdf-10 text-slate-500">${authority.designation}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}
