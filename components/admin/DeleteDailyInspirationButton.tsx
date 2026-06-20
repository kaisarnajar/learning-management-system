"use client";

import { deleteDailyInspiration } from "@/app/admin/daily-inspiration/actions";
import { dailyInspirationKindLabel } from "@/lib/daily-inspiration";
import type { DailyInspirationKind } from "@prisma/client";

export function DeleteDailyInspirationButton({
  id,
  kind,
}: {
  id: string;
  kind: DailyInspirationKind;
}) {
  const label = dailyInspirationKindLabel(kind);

  return (
    <form
      action={deleteDailyInspiration.bind(null, id)}
      onSubmit={(e) => {
        if (!confirm(`Delete this ${label.toLowerCase()}? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-sm font-medium text-destructive-text hover:underline">
        Delete
      </button>
    </form>
  );
}
