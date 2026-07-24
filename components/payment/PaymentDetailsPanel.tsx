"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { BRAND_CONFIG } from "@/config/brand";
import { BankDetailsCard } from "@/components/payment/BankDetailsCard";
import { CopyButton } from "@/components/payment/CopyButton";
import {
  type PaymentSettingsData,
  isUpiConfiguredFromSettings,
  toBankDetails,
} from "@/services/payment-settings";
import {
  buildUpiPaymentUrlFromSettings,
  buildUpiVpaUrlFromSettings,
} from "@/services/upi";

type PaymentDetailsPanelProps = {
  settings: PaymentSettingsData;
  paymentRef?: string;
  amountLabel?: string;
  amountPaise?: number;
  paymentNote?: string;
};

export function PaymentDetailsPanel({
  settings,
  paymentRef,
  amountLabel,
  amountPaise,
  paymentNote = `${BRAND_CONFIG.name} registration`,
}: PaymentDetailsPanelProps) {
  const upiReady = isUpiConfiguredFromSettings(settings);
  const bank = toBankDetails(settings);
  const upiId = settings.upiId;
  const hasFixedAmount = amountPaise != null && amountLabel;

  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (!upiReady) return;

    const upiUrl =
      hasFixedAmount && amountPaise! > 0
        ? buildUpiPaymentUrlFromSettings(settings, {
            amountPaise: amountPaise!,
            payeeName: settings.upiPayeeName,
            note: paymentNote.slice(0, 80),
            transactionRef: paymentRef ?? `FEE-${amountPaise}`,
          })
        : buildUpiVpaUrlFromSettings(settings);

    QRCode.toDataURL(upiUrl, {
      width: 280,
      margin: 2,
      color: { dark: "#1c1917", light: "#ffffff" },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Error generating UPI QR Code:", err));
  }, [upiReady, hasFixedAmount, amountPaise, settings, paymentNote, paymentRef]);

  return (
    <div className="card-elevated space-y-6 p-6 sm:p-8">
      {hasFixedAmount && (
        <div className="text-center">
          <p className="text-sm text-muted">Amount to pay</p>
          <p className="text-3xl font-bold text-foreground">
            {amountPaise === 0 ? "FREE" : amountLabel}
          </p>
          {amountPaise === 0 && (
            <p className="mt-1 text-xs font-semibold text-emerald-600">
              100% Fee Waiver Applied — No Payment Required
            </p>
          )}
        </div>
      )}

      {amountPaise === 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 text-center text-sm text-emerald-800 shadow-sm">
          <p className="font-semibold text-emerald-900">Your fee is 100% waived!</p>
          <p className="mt-1 text-xs text-emerald-700">
            You do not need to scan QR or transfer funds. Simply click the claim button below to complete your enrollment.
          </p>
        </div>
      ) : (
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
                    className="h-auto w-ui-200 sm:w-[220px]"
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
                amountLabel={hasFixedAmount ? (amountPaise === 0 ? "FREE" : amountLabel) : undefined}
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
      )}
    </div>
  );
}
