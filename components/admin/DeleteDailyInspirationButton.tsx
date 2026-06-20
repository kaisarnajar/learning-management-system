"use client";

import { deleteDailyInspiration } from "@/app/admin/daily-inspiration/actions";
import { dailyInspirationKindLabel } from "@/lib/daily-inspiration";
import type { DailyInspirationKind } from "@prisma/client";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";

export function DeleteDailyInspirationButton({
  id,
  kind,
}: {
  id: string;
  kind: DailyInspirationKind;
}) {
  const label = dailyInspirationKindLabel(kind);

  return (
    <DeleteActionButton
      action={deleteDailyInspiration.bind(null, id)}
      itemName={label.toLowerCase()}
      className="text-sm font-medium text-destructive-text hover:underline"
    />
  );
}
