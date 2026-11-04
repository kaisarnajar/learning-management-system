import { PAGINATION } from "@/config/constants/business";

const API_DEFAULT_PAGE_SIZE = 20;

/**
 * Reads `page` and `pageSize` from a list endpoint's query string.
 *
 * `page` is clamped to >= 1 and `pageSize` to 1..PAGINATION.MAX_PAGE_SIZE;
 * missing or non-numeric values fall back to page 1 / the default page size,
 * so a client can never request an unbounded result set.
 */
export function parseApiPagination(
  searchParams: URLSearchParams,
  defaultPageSize: number = API_DEFAULT_PAGE_SIZE,
): { page: number; pageSize: number } {
  const rawPage = Number.parseInt(searchParams.get("page") ?? "", 10);
  const rawPageSize = Number.parseInt(searchParams.get("pageSize") ?? "", 10);

  const page = Number.isNaN(rawPage) ? 1 : Math.max(1, rawPage);
  const pageSize = Number.isNaN(rawPageSize)
    ? defaultPageSize
    : Math.min(PAGINATION.MAX_PAGE_SIZE, Math.max(1, rawPageSize));

  return { page, pageSize };
}
