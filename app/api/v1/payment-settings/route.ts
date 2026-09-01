import { NextRequest, NextResponse } from "next/server";
import { getPaymentSettings } from "@/services/payment-settings";

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
    console.error("[api/v1/payment-settings] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payment settings." },
      { status: 500 }
    );
  }
}
