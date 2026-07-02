import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth-actions";
import { prisma } from "@/lib/prisma";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { deleteShippingSlab } from "./actions";
import { ShippingSlabForm } from "@/components/admin/ShippingSlabForm";

export const metadata: Metadata = {
  title: "Shipping Charges — Admin",
  description: "Configure shipping charges based on weight slabs.",
};

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export default async function AdminShippingChargesPage() {
  await requireAdmin();

  const slabs = await prisma.shippingChargeSlab.findMany({
    orderBy: { minWeightGrams: "asc" },
  });

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary">Shipping Charges</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Configure shipping charges based on order weight. If an order&apos;s total weight exceeds all slabs, the highest slab&apos;s charge is applied. If it falls below all slabs, no charge is applied. (Unless you configure a slab starting from 0g).
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-start">
        {/* Left Side: Slabs List */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">Current Slabs</h2>
          <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
            {slabs.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">
                No shipping slabs configured yet.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-background/50 text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Weight Range (g)</th>
                    <th className="px-4 py-3 font-medium">Charge</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {slabs.map((slab) => (
                    <tr key={slab.id}>
                      <td className="px-4 py-3">
                        {slab.minWeightGrams}g – {slab.maxWeightGrams}g
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {formatPrice(slab.chargeInrPaise)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DeleteActionButton
                          action={deleteShippingSlab.bind(null, slab.id)}
                          itemName={`Slab ${slab.minWeightGrams}-${slab.maxWeightGrams}g`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Side: Add New Slab Form */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">Add New Slab</h2>
          <div className="mt-4 rounded-lg border border-border bg-surface p-4 sm:p-6">
            <ShippingSlabForm />
          </div>
        </div>
      </div>
    </div>
  );
}
