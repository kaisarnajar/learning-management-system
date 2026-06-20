"use client";

type DeleteFormProps = {
  action: () => Promise<void>;
  label?: string;
};

export function DeleteForm({ action, label = "Delete" }: DeleteFormProps) {
  return (
    <form
      action={action}
      className="mt-8 border-t border-border pt-6"
      onSubmit={(e) => {
        if (!confirm(`Are you sure you want to ${label.toLowerCase()} this item?`)) {
          e.preventDefault();
        }
      }}
    >
      <p className="text-sm font-medium text-destructive-text">Danger zone</p>
      <button
        type="submit"
        className="mt-2 rounded-md border border-red-300 bg-destructive-bg px-4 py-2 text-sm font-medium text-destructive-text hover:bg-destructive-bg"
      >
        {label}
      </button>
    </form>
  );
}
