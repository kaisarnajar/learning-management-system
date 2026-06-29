"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-actions";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const slabSchema = z.object({
  minWeightGrams: z.coerce.number().int().min(0, "Minimum weight must be 0 or more."),
  maxWeightGrams: z.coerce.number().int().min(1, "Maximum weight must be at least 1."),
  chargeInr: z.coerce.number().min(0, "Charge cannot be negative."),
}).refine(data => data.maxWeightGrams > data.minWeightGrams, {
  message: "Maximum weight must be greater than minimum weight.",
  path: ["maxWeightGrams"]
});

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
    // Basic overlap check
    const existing = await prisma.shippingChargeSlab.findMany();
    for (const slab of existing) {
      if (
        (parsed.data.minWeightGrams >= slab.minWeightGrams && parsed.data.minWeightGrams <= slab.maxWeightGrams) ||
        (parsed.data.maxWeightGrams >= slab.minWeightGrams && parsed.data.maxWeightGrams <= slab.maxWeightGrams) ||
        (parsed.data.minWeightGrams <= slab.minWeightGrams && parsed.data.maxWeightGrams >= slab.maxWeightGrams)
      ) {
        return { error: "Slab weight range overlaps with an existing slab." };
      }
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
