import { CopyButton } from "@/components/payment/CopyButton";
import type { BankDetails } from "@/services/payment-settings";

type BankDetailsCardProps = {
  bank: BankDetails;
  paymentRef?: string;
  amountLabel?: string;
  amountHint?: string;
};

export function BankDetailsCard({ bank, paymentRef, amountLabel, amountHint }: BankDetailsCardProps) {
  const rows: { label: string; value: string; mono?: boolean }[] = [
    { label: "Account name", value: bank.accountName },
    { label: "Bank", value: bank.bankName },
    { label: "Account number", value: bank.accountNumber, mono: true },
    { label: "IFSC", value: bank.ifsc, mono: true },
    { label: "Branch", value: bank.branch },
  ];

  if (amountLabel) {
    rows.push({ label: "Amount", value: amountLabel });
  } else if (amountHint) {
    rows.push({ label: "Amount", value: amountHint });
  }

  if (paymentRef) {
    rows.push({ label: "Reference (include in remarks)", value: paymentRef, mono: true });
  }

  return (
    <div className="rounded-lg border border-border bg-background px-4 py-4">
      <p className="text-sm font-semibold text-foreground">Bank transfer (NEFT / IMPS / RTGS)</p>
      <dl className="mt-4 space-y-3 text-sm">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
          >
            <dt className="shrink-0 text-muted">{row.label}</dt>
            <dd
              className={`text-right font-medium text-foreground sm:text-left ${row.mono ? "font-mono text-xs sm:text-sm" : ""}`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-end">
        <CopyButton text={bank.accountNumber} label="Copy account no." />
        <CopyButton text={bank.ifsc} label="Copy IFSC" />
        {paymentRef && <CopyButton text={paymentRef} label="Copy reference" />}
      </div>
    </div>
  );
}
