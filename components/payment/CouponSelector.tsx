"use client";

import { format } from "date-fns";
import type { ApplicableCoupon } from "@/services/coupons";
import { formatPrice } from "@/services/courses";

type CouponSelectorProps = {
  coupons: ApplicableCoupon[];
  selectedCouponId: string;
  onSelectCoupon: (id: string) => void;
  baseFeePaise: number;
};

export function CouponSelector({
  coupons,
  selectedCouponId,
  onSelectCoupon,
  baseFeePaise,
}: CouponSelectorProps) {
  if (coupons.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
          Available Coupons & Fee Waivers
        </h4>
        <span className="text-xs text-muted font-medium">
          Select one coupon to apply
        </span>
      </div>

      <div className="space-y-2">
        {coupons.map((coupon) => {
          const isUsed = coupon.isUsed;
          const isSelected = selectedCouponId === coupon.id && !isUsed;
          const discountAmountPaise = Math.floor((baseFeePaise * coupon.percentage) / 100);
          const finalPaise = Math.max(0, baseFeePaise - discountAmountPaise);

          return (
            <label
              key={coupon.id}
              onClick={() => {
                if (!isUsed) onSelectCoupon(coupon.id);
              }}
              className={`flex items-center justify-between rounded-lg border p-3.5 transition-all ${
                isUsed
                  ? "opacity-60 bg-muted/20 border-border cursor-not-allowed select-none"
                  : isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary cursor-pointer"
                  : "border-border bg-background hover:bg-accent-muted/40 cursor-pointer"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="couponChoice"
                  value={coupon.id}
                  checked={isSelected}
                  disabled={isUsed}
                  onChange={() => {
                    if (!isUsed) onSelectCoupon(coupon.id);
                  }}
                  className="h-4 w-4 text-primary focus:ring-primary disabled:opacity-50"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-mono font-bold text-sm ${isUsed ? "line-through text-muted" : "text-foreground"}`}>
                      {coupon.code}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                      isUsed
                        ? "bg-gray-100 text-gray-500 border border-gray-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}>
                      {coupon.percentage}% OFF
                    </span>
                    {coupon.type === "SPECIAL" && (
                      <span className="inline-flex items-center rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                        Special Waiver
                      </span>
                    )}
                    {isUsed && (
                      <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        Already Used
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {isUsed
                      ? "You have already used this coupon."
                      : `Valid until ${format(new Date(coupon.validUntil), "dd MMM, yyyy")}`}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className={`text-sm font-bold ${isUsed ? "text-muted line-through" : "text-emerald-600"}`}>
                  Save {formatPrice(discountAmountPaise)}
                </p>
                <p className="text-xs text-muted">
                  Fee: {finalPaise === 0 ? "FREE (100% Waived)" : formatPrice(finalPaise)}
                </p>
              </div>
            </label>
          );
        })}

        <label
          onClick={() => onSelectCoupon("none")}
          className={`flex cursor-pointer items-center justify-between rounded-lg border p-3.5 transition-all ${
            selectedCouponId === "none" || selectedCouponId === ""
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-border bg-background hover:bg-accent-muted/40"
          }`}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="couponChoice"
              value="none"
              checked={selectedCouponId === "none" || selectedCouponId === ""}
              onChange={() => onSelectCoupon("none")}
              className="h-4 w-4 text-primary focus:ring-primary"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">Do not use any coupon</p>
              <p className="text-xs text-muted">Pay full fee amount without waiver</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-foreground">{formatPrice(baseFeePaise)}</p>
          </div>
        </label>
      </div>
    </div>
  );
}
