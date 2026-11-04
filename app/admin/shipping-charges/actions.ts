"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/services/auth-actions";
import { prisma } from "@/utils/prisma";
import { slabSchema } from "@/utils/validations";
import { validateSlabSet } from "@/services/book-orders";

export async function createShippingSlab(formData: FormData) {
  await requireAdmin();

  const parsed = slabSchema.safeParse({
    minWeightGrams: formData.get("minWeightGrams"),
    maxWeightGrams: formData.get("maxWeightGrams"),
    chargeInr: formData.get("chargeInr"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }

  const chargeInrPaise = Math.round(parsed.data.chargeInr * 100);

  try {
    // The full set (existing + new) must stay contiguous from 0 g with no overlaps,
    // otherwise some order weights would fall through to the wrong charge.
    const existing = await prisma.shippingChargeSlab.findMany();
    const problems = validateSlabSet([
      ...existing,
      { minWeightGrams: parsed.data.minWeightGrams, maxWeightGrams: parsed.data.maxWeightGrams, chargeInrPaise },
    ]);
    if (problems.length > 0) {
      return { error: problems[0] };
    }

    await prisma.shippingChargeSlab.create({
      data: {
        minWeightGrams: parsed.data.minWeightGrams,
        maxWeightGrams: parsed.data.maxWeightGrams,
        chargeInrPaise,
      },
    });
  } catch (error) {
    console.error("Database error creating shipping slab:", error);
    return { error: "Failed to create shipping slab." };
  }

  revalidatePath("/admin/shipping-charges");
  return { success: true };
}

export async function deleteShippingSlab(id: string) {
  await requireAdmin();

  try {
    const existing = await prisma.shippingChargeSlab.findMany();
    const remaining = existing.filter((slab) => slab.id !== id);
    const problems = validateSlabSet(remaining);
    if (remaining.length > 0 && problems.length > 0) {
      return { error: `Removing this slab would leave an invalid set: ${problems[0]} Delete slabs from the top down, or add a replacement first.` };
    }
    await prisma.shippingChargeSlab.delete({
      where: { id },
    });
  } catch (error) {
    console.error("Database error deleting shipping slab:", error);
    return { error: "Failed to delete shipping slab." };
  }

  revalidatePath("/admin/shipping-charges");
  return { success: true };
}
