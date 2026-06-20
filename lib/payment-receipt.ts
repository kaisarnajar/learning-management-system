export function formatInvoiceNumber(paymentRecordId: string): string {
  let hash = 0;
  for (let i = 0; i < paymentRecordId.length; i++) {
    hash = Math.imul(31, hash) + paymentRecordId.charCodeAt(i);
    hash |= 0;
  }
  const num = (Math.abs(hash) % 99800) + 201;
  return `INV${String(num).padStart(5, "0")}`;
}

export function getReceiptFilename(courseTitle: string, paymentRecordId: string): string {
  const slug = courseTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  return `invoice-${slug || "payment"}-${paymentRecordId.slice(0, 8)}.pdf`;
}
