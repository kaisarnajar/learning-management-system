"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { createShippingSlab } from "@/app/admin/shipping-charges/actions";
import { labelClassName } from "@/utils/form";
import { formFieldInputClass } from "@/utils/form-validation";

export function ShippingSlabForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const minWeightGrams = Number(formData.get("minWeightGrams"));
    const maxWeightGrams = Number(formData.get("maxWeightGrams"));

    if (minWeightGrams >= maxWeightGrams) {
      setError("Maximum weight must be greater than minimum weight.");
      setLoading(false);
      return;
    }

    try {
      const result = await createShippingSlab(formData);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      form.reset();
      setLoading(false);
    } catch (error) {
      console.error(error);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="minWeight" className={labelClassName}>
            Min Weight (g) <span className="text-destructive-text">*</span>
          </label>
          <input
            id="minWeight"
            name="minWeightGrams"
            type="number"
            min="0"
            step="1"
            required
            className={formFieldInputClass(false)}
            placeholder="e.g. 0"
          />
        </div>
        <div>
          <label htmlFor="maxWeight" className={labelClassName}>
            Max Weight (g) <span className="text-destructive-text">*</span>
          </label>
          <input
            id="maxWeight"
            name="maxWeightGrams"
            type="number"
            min="1"
            step="1"
            required
            className={formFieldInputClass(false)}
            placeholder="e.g. 200"
          />
        </div>
      </div>
      <div>
        <label htmlFor="chargeInr" className={labelClassName}>
          Shipping Charge (₹) <span className="text-destructive-text">*</span>
        </label>
        <input
          id="chargeInr"
          name="chargeInr"
          type="number"
          min="0"
          step="0.01"
          required
          className={formFieldInputClass(false)}
          placeholder="e.g. 50"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-destructive-bg px-4 py-3 text-sm text-destructive-text" role="alert">
          {error}
        </p>
      )}

      <SubmitButton
        type="submit"
        disabled={loading}
        isSubmitting={loading}
        className="w-full min-h-11 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-light disabled:opacity-60 transition-colors"
      >
        {loading ? "Adding…" : "Add Slab"}
      </SubmitButton>
    </form>
  );
}
