import { withDbErrorHandling } from "@/utils/db-error";
import { clampPage, paginationArgs, type PaginatedResult } from "@/utils/pagination";

/**
 * A generic helper to handle the common pattern of running `count` and `findMany` sequentially
 * with page clamping.
 */
export async function paginateQuery<T>(
  model: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findMany: (args: any) => Promise<T[]>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    count: (args: { where?: any }) => Promise<number>;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any,
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
