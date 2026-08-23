"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function StudentSortSelect({ currentSort }: { currentSort?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const activeSort = currentSort || "regNo_asc";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    const newSort = e.target.value;
    if (newSort === "regNo_asc") {
      params.delete("sort");
    } else {
      params.set("sort", newSort);
    }
    params.delete("page");
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="student-sort-select" className="text-sm font-medium text-muted whitespace-nowrap">
        Sort by:
      </label>
      <select
        id="student-sort-select"
        value={activeSort}
        onChange={handleChange}
        className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="regNo_asc">Reg No (Ascending)</option>
        <option value="regNo_desc">Reg No (Descending)</option>
        <option value="name_asc">Name (A → Z)</option>
        <option value="name_desc">Name (Z → A)</option>
        <option value="date_desc">Date Registered (Newest First)</option>
        <option value="date_asc">Date Registered (Oldest First)</option>
        <option value="email_asc">Email (A → Z)</option>
        <option value="email_desc">Email (Z → A)</option>
      </select>
    </div>
  );
}
