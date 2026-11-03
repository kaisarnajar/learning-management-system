import { PAYMENTS } from "@/config/constants/payments";

/**
 * Splits a GST-INCLUSIVE amount into its taxable base and tax component.
 *
 * For an inclusive price P at rate r%: tax = P × r / (100 + r), base = P − tax.
 * Example at 18%: ₹100.00 → tax ₹15.25, base ₹84.75 (not ₹18 / ₹82, which is
 * what "P × r%" would give and overstates the tax).
 */
export function splitInclusiveGst(
  totalPaise: number,
  ratePercent: number = PAYMENTS.GST_PERCENTAGE,
): { basePaise: number; gstPaise: number } {
  if (totalPaise <= 0 || ratePercent <= 0) return { basePaise: Math.max(0, totalPaise), gstPaise: 0 };
  const gstPaise = Math.round((totalPaise * ratePercent) / (100 + ratePercent));
  return { basePaise: totalPaise - gstPaise, gstPaise };
}
