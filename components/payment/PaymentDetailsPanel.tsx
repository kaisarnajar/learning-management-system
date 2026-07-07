import Image from "next/image";
import { BRAND_CONFIG } from "@/config/brand";
import { BankDetailsCard } from "@/components/payment/BankDetailsCard";
import { CopyButton } from "@/components/payment/CopyButton";
import {
  buildUpiPaymentUrlFromSettings,
  buildUpiVpaUrlFromSettings,
  generateUpiQrDataUrl,
} from "@/lib/upi";
import { getPaymentSettings, isUpiConfiguredFromSettings, toBankDetails } from "@/lib/payment-settings";

type PaymentDetailsPanelProps = {
  /** Enrollment payment: fixed amount and reference for QR and bank transfer. */
  paymentRef?: string;
  amountLabel?: string;
  amountPaise?: number;
  paymentNote?: string;
};

export async function PaymentDetailsPanel({
  paymentRef,
  amountLabel,
  amountPaise,
  paymentNote = `${BRAND_CONFIG.name} registration`,
}: PaymentDetailsPanelProps) {
  const settings = await getPaymentSettings();
  const upiReady = isUpiConfiguredFromSettings(settings);
  const bank = toBankDetails(settings);
  const upiId = settings.upiId;
  const hasFixedAmount = amountPaise != null && amountLabel;

  const qrDataUrl =
    upiReady &&
    (await generateUpiQrDataUrl(
      hasFixedAmount
        ? buildUpiPaymentUrlFromSettings(settings, {
            amountPaise: amountPaise!,
            payeeName: settings.upiPayeeName,
            note: paymentNote.slice(0, 80),
            transactionRef: paymentRef ?? `FEE-${amountPaise}`,
          })
        : buildUpiVpaUrlFromSettings(settings),
    ));

  return (
    <div className="card-elevated space-y-6 p-6 sm:p-8">
      {hasFixedAmount && (
        <div className="text-center">
          <p className="text-sm text-muted">Amount to pay</p>
          <p className="text-3xl font-bold text-foreground">{amountLabel}</p>
        </div>
      )}

      <div
        className={
          upiReady ? "grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10" : "mx-auto max-w-xl"
        }
      >
        {upiReady && qrDataUrl && (
          <section className="flex h-full flex-col">
            <h2 className="text-center text-sm font-bold uppercase tracking-wide text-primary lg:text-left">
              UPI
            </h2>
            <div className="mx-auto mt-4 flex flex-1 flex-col lg:mx-0">
              <div className="flex justify-center rounded-xl border border-border bg-surface p-4 lg:justify-start">
                <Image
                  src={qrDataUrl}
                  alt="UPI QR code — scan with Google Pay, PhonePe, or Paytm"
                  width={280}
                  height={280}
                  className="h-auto w-[200px] sm:w-[220px]"
                  unoptimized
                />
              </div>
              <p className="mt-3 text-center text-sm font-medium text-foreground lg:text-left">
                Scan with Google Pay, PhonePe, Paytm, or any UPI app
              </p>
              <div className="mt-4 flex flex-col items-center gap-3 rounded-lg bg-background px-4 py-3 text-center lg:items-start lg:text-left">
                <div>
                  <p className="text-xs text-muted">UPI ID</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">{upiId}</p>
                </div>
                <CopyButton text={upiId} label="Copy UPI ID" />
                {settings.upiNumber && (
                  <div className="w-full border-t border-border pt-3 flex flex-col items-center lg:items-start">
                    <p className="text-xs text-muted">UPI Number</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">{settings.upiNumber}</p>
                    <div className="mt-2">
                      <CopyButton text={settings.upiNumber} label="Copy UPI Number" />
                    </div>
                  </div>
                )}
                {paymentRef && (
                  <div className="w-full border-t border-border pt-3">
                    <p className="text-xs text-muted">Payment reference (include if asked)</p>
                    <p className="mt-0.5 font-mono text-xs text-foreground">{paymentRef}</p>
                    <div className="mt-2">
                      <CopyButton text={paymentRef} label="Copy reference" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <section
          className={`flex h-full flex-col ${upiReady ? "lg:border-l lg:border-border lg:pl-10" : ""}`}
        >
          <h2 className="text-center text-sm font-bold uppercase tracking-wide text-primary lg:text-left">
            Bank transfer
          </h2>
          <div className="mt-4 flex-1">
            <BankDetailsCard
              bank={bank}
              paymentRef={paymentRef}
              amountLabel={hasFixedAmount ? amountLabel : undefined}
            />
          </div>
          {!paymentRef && (
            <p className="mt-3 text-center text-xs text-muted lg:text-left">
              Include your name and course in the bank transfer remarks. Submit the transaction reference
              after paying.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
