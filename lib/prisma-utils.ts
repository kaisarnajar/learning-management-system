import { withDbErrorHandling } from "@/lib/db-error";
import { clampPage, paginationArgs, type PaginatedResult } from "@/lib/pagination";

/**
 * A generic helper to handle the common pattern of running `count` and `findMany` sequentially
 * with page clamping.
 */
export async function paginateQuery<T, W = unknown>(
  model: {
    findMany: (args: unknown) => Promise<T[]>;
    count: (args: { where?: W }) => Promise<number>;
  },
  args: {
    where?: W;
    orderBy?: unknown;
    include?: unknown;
    select?: unknown;
  },
  page: number,
  pageSize: number
): Promise<PaginatedResult<T>> {
  const totalCount = await withDbErrorHandling(
    () => model.count({ where: args.where }),
    "Database operation failed"
  );
  
  const safePage = clampPage(page, totalCount, pageSize);
  
  const items = await withDbErrorHandling(
    () => model.findMany({
      ...args,
      ...paginationArgs(safePage, pageSize),
    }),
    "Database operation failed"
  );

  return { items, totalCount };
}
