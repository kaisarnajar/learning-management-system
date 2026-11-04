import { useCallback, useEffect, useRef, useState } from "react";

/**
 * State and wiring for a native `<dialog>` opened with `showModal()`: keeps the element in sync
 * with `isOpen` and routes Escape (the `cancel` event) through `close` so state never drifts.
 */
export function useDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && dialog && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      setIsOpen(false);
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, []);

  return { dialogRef, isOpen, open, close };
}
