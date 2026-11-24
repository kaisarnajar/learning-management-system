/**
 * Reports (and optionally corrects) the stored fee/GST split on receipts that
 * were generated with the old formula (GST = total × 18%) instead of the
 * inclusive formula (GST = total × 18 / 118).
 *
 * Usage:
 *   npx tsx scripts/recompute-receipt-gst.ts            # dry run: report only
 *   npx tsx scripts/recompute-receipt-gst.ts --apply    # rewrite receiptFeeAmountPaise / receiptGstAmountPaise
 *
 * Voided records are skipped. A corrected record's stored PDF (receiptPdfKey)
 * is discarded, so the next download renders the corrected split.
 *
 * DEFAULT RECOMMENDATION: do NOT apply to receipts that have already been
 * sent to students. Indian GST practice is to leave an issued invoice as it
 * is and correct it with a credit/debit note. Apply only on the finance
 * owner's written instruction, and only to the receipts they list.
 *
 * Filter to specific receipts with --ids=id1,id2 (comma separated).
 */
import { PrismaClient } from "@prisma/client";
import { isApplyMode, printMode, writeSnapshot } from "./lib/dry-run";
import { applyReceiptGstCorrections, findReceiptGstCorrections } from "./lib/receipt-gst";

const prisma = new PrismaClient();

function parseIds(argv: string[]): string[] | null {
  const arg = argv.find((a) => a.startsWith("--ids="));
  if (!arg) return null;
  return arg.slice("--ids=".length).split(",").map((s) => s.trim()).filter(Boolean);
}

async function main() {
  const apply = isApplyMode();
  const ids = parseIds(process.argv);
  printMode("recompute-receipt-gst", apply);

  const { inspected, corrections } = await findReceiptGstCorrections(prisma, ids);

  console.log(`Live GST receipts inspected (voided excluded): ${inspected}; with a wrong fee/GST split: ${corrections.length}`);
  for (const c of corrections) {
    console.log(
      `  ${c.invoiceNumber ?? c.id}  total ₹${(c.itemTotalPaise / 100).toFixed(2)}  stored fee/GST ₹${((c.storedFeePaise ?? 0) / 100).toFixed(2)}/₹${((c.storedGstPaise ?? 0) / 100).toFixed(2)}  correct ₹${(c.correctFeePaise / 100).toFixed(2)}/₹${(c.correctGstPaise / 100).toFixed(2)}${c.emailedAt ? "  (ALREADY EMAILED)" : ""}${c.receiptPdfKey ? "  (stored PDF will be discarded)" : ""}`,
    );
  }

  if (!apply || corrections.length === 0) {
    if (!apply && corrections.length > 0) {
      console.log("Dry run only. Re-run with --apply (optionally --ids=...) after the finance owner approves.");
    }
    return;
  }

  const snapshot = writeSnapshot("recompute-receipt-gst", corrections);
  console.log(`Snapshot written to ${snapshot}`);

  // Loaded only when writing: it pulls in the storage client.
  const { deleteStoredReceiptPdf } = await import("../services/documents");
  await applyReceiptGstCorrections(prisma, corrections, deleteStoredReceiptPdf);
  console.log(`Corrected ${corrections.length} receipt(s); their stored PDFs were discarded and will be re-rendered on download.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
