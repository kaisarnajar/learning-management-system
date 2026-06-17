export function StatusBadge({ published }: { published: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        published ? "bg-info-bg text-info-text" : "bg-surface-muted-hover text-stone-700"
      }`}
    >
      {published ? "Published" : "Not published"}
    </span>
  );
}
