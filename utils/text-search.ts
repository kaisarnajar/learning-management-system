/**
 * Text search helpers for admin list filters.
 * Uses Prisma `contains` with PostgreSQL `mode: 'insensitive'`.
 */

export const SEARCH_PARAM = "q";

const MAX_QUERY_LENGTH = 100;

export type TextSearchWhere = Record<string, unknown>;

export function parseSearchQuery(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, MAX_QUERY_LENGTH);
}

/** Build `{ OR: [{ field: { contains: q, mode: 'insensitive' } }, ...] }` for top-level string fields. */
export function buildContainsOr(fields: readonly string[], q: string): TextSearchWhere {
  return {
    OR: fields.map((field) => ({ [field]: { contains: q, mode: "insensitive" } })),
  };
}

/** Merge two Prisma where clauses with AND. */
export function andWhere(
  base: TextSearchWhere | undefined,
  extra: TextSearchWhere | undefined,
): TextSearchWhere | undefined {
  if (!base) return extra;
  if (!extra) return base;
  return { AND: [base, extra] };
}

/** Build OR clause matching nested relation string fields, e.g. `{ user: { name: { contains: q, mode: 'insensitive' } } }`. */
export function buildRelationContainsOr(
  relations: { relation: string; fields: readonly string[] }[],
  q: string,
): TextSearchWhere {
  const clauses: Record<string, unknown>[] = [];

  for (const { relation, fields } of relations) {
    for (const field of fields) {
      clauses.push({ [relation]: { [field]: { contains: q, mode: "insensitive" } } });
    }
  }

  return { OR: clauses };
}

/** Combine top-level field OR with relation field OR into a single OR array. */
export function buildSearchOr(
  topLevelFields: readonly string[],
  relations: { relation: string; fields: readonly string[] }[],
  q: string,
): TextSearchWhere {
  const topLevel = buildContainsOr(topLevelFields, q);
  const relationLevel = buildRelationContainsOr(relations, q);
  return { OR: [...(topLevel.OR as Record<string, unknown>[]), ...(relationLevel.OR as Record<string, unknown>[])] };
}
