import { NextRequest, NextResponse } from "next/server";
import { getPaymentSettings } from "@/services/payment-settings";
import { apiServerError } from "@/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const settings = await getPaymentSettings();
    return NextResponse.json({
      success: true,
      settings: {
        upiId: settings.upiId,
        upiNumber: settings.upiNumber,
        upiPayeeName: settings.upiPayeeName,
        bankAccountName: settings.bankAccountName,
        bankName: settings.bankName,
        bankAccountNumber: settings.bankAccountNumber,
        bankIfsc: settings.bankIfsc,
        bankBranch: settings.bankBranch,
        feeWaiverEnabled: settings.feeWaiverEnabled,
      },
    });
  } catch (error) {
    return apiServerError("api/v1/payment-settings", error, "Failed to fetch payment settings.");
  }
}
