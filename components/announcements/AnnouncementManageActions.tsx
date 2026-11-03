import Link from "next/link";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { adminActionButtonClassName } from "@/utils/form";

/** Edit link and delete button for the `actions` slot of `AnnouncementCard`. */
export function AnnouncementManageActions({
  editHref,
  deleteAction,
  itemName = "announcement",
}: {
  editHref: string;
  deleteAction: () => Promise<void>;
  itemName?: string;
}) {
  return (
    <>
      <Link href={editHref} className={adminActionButtonClassName}>
        Edit
      </Link>
      <DeleteActionButton action={deleteAction} itemName={itemName} />
    </>
  );
}
