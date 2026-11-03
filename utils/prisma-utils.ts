import { withDbErrorHandling } from "@/utils/db-error";
import { clampPage, paginationArgs, type PaginatedResult } from "@/utils/pagination";

/**
 * A generic helper to handle the common pattern of running `count` and `findMany` sequentially
 * with page clamping.
 *
 * `T` is the row type the caller expects for `args` (including any `include`
 * or `select`); pass it explicitly, e.g. `paginateQuery<MyRowWithUser>(...)`.
 * Prisma's delegate types cannot be threaded through a dynamic `args` object,
 * so the row type is declared here once instead of with a cast at every call
 * site. When `T` is omitted the result is `PaginatedResult<unknown>` and will
 * not type-check against a typed return.
 */
export async function paginateQuery<T = unknown>(
  model: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findMany: (args: any) => Promise<unknown[]>;
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

  return { items: items as T[], totalCount };
}
