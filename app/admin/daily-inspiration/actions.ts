"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { createAdminCrudActions, parseFormWith } from "@/services/admin-crud";
import { prisma } from "@/utils/prisma";
import { dailyInspirationSchema } from "@/utils/validations";
import { revalidatePublicContent } from "@/services/public-cache";

const LIST_PATH = "/admin/daily-inspiration";

function revalidateDailyInspirationPaths() {
  revalidatePath("/");

  revalidatePublicContent();
  revalidatePath("/admin");
  revalidatePath(LIST_PATH);
}

const parseDailyInspirationForm = parseFormWith(dailyInspirationSchema, (formData: FormData) => ({
  kind: formData.get("kind"),
  arabicText: formData.get("arabicText"),
  englishTranslation: formData.get("englishTranslation"),
  reference: formData.get("reference") ?? "",
  published: formData.get("published") === "on",
}));

const crud = createAdminCrudActions({
  label: "daily inspiration",
  model: {
    find: (id) => prisma.dailyInspiration.findUnique({ where: { id } }),
    create: (data) => prisma.dailyInspiration.create({ data: data as Prisma.DailyInspirationUncheckedCreateInput }),
    update: (id, data) => prisma.dailyInspiration.update({ where: { id }, data: data as Prisma.DailyInspirationUncheckedUpdateInput }),
    remove: (id) => prisma.dailyInspiration.delete({ where: { id } }),
  },
  parse: parseDailyInspirationForm,
  paths: {
    list: LIST_PATH,
    afterUpdate: (id) => `${LIST_PATH}/${id}/edit?saved=1`,
    revalidate: revalidateDailyInspirationPaths,
  },
  hooks: {
    toColumns: (data) => ({
      kind: data.kind,
      arabicText: data.arabicText,
      englishTranslation: data.englishTranslation,
      reference: data.reference || null,
      published: data.published,
    }),
    prepareCreate: async ({ session }) => ({ columns: { createdById: session.user.id } }),
  },
});

export async function createDailyInspiration(formData: FormData) {
  return crud.create(formData);
}

export async function updateDailyInspiration(id: string, formData: FormData) {
  return crud.update(id, formData);
}

export async function deleteDailyInspiration(id: string) {
  return crud.remove(id);
}
