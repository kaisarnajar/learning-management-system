export const DEFAULT_PAGE_SIZE = 20;
export const GRID_PAGE_SIZE = 12;
export const APPROVAL_PAGE_SIZE = 10;

export type PaginatedResult<T> = {
  items: T[];
  totalCount: number;
};

export function parsePageParam(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

export function parsePaginationParams(
  params: Record<string, string | undefined>,
  options: { pageSize?: number; pageParam?: string } = {},
): { page: number; pageSize: number } {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const pageParam = options.pageParam ?? "page";
  const page = parsePageParam(params[pageParam]);
  return { page, pageSize };
}

export function clampPage(page: number, totalCount: number, pageSize: number): number {
  const totalPages = getTotalPages(totalCount, pageSize);
  if (totalPages === 0) return 1;
  return Math.min(page, totalPages);
}

export function paginationArgs(page: number, pageSize: number): { skip: number; take: number } {
  const safePage = Math.max(1, page);
  return {
    skip: (safePage - 1) * pageSize,
    take: pageSize,
  };
}

export function getTotalPages(totalCount: number, pageSize: number): number {
  if (totalCount <= 0 || pageSize <= 0) return 0;
  return Math.ceil(totalCount / pageSize);
}

export function buildPageHref(
  basePath: string,
  params: Record<string, string | undefined>,
  page: number,
  options: { pageParam?: string; omitPageWhenOne?: boolean } = {},
): string {
  const pageParam = options.pageParam ?? "page";
  const omitPageWhenOne = options.omitPageWhenOne ?? true;
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    if (key === pageParam) continue;
    searchParams.set(key, value);
  }

  if (!omitPageWhenOne || page > 1) {
    searchParams.set(pageParam, String(page));
  }

  const qs = searchParams.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
