import { Prisma } from "@prisma/client";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export type DbErrorCode = "UNIQUE" | "NOT_FOUND" | "FK" | "UNKNOWN";

/**
 * A database failure translated into something the caller can act on: a
 * stable `code` and a message that is safe to show to a user. Prisma's own
 * message (table names, SQL fragments) stays in the server log only.
 */
export class DbError extends Error {
  constructor(public readonly code: DbErrorCode, message: string) {
    super(message);
    this.name = "DbError";
  }
}

export function isDbError(error: unknown, code?: DbErrorCode): error is DbError {
  return error instanceof DbError && (code === undefined || error.code === code);
}

const USER_MESSAGES: Record<Exclude<DbErrorCode, "UNKNOWN">, string> = {
  UNIQUE: "A record with the same value already exists.",
  NOT_FOUND: "The record no longer exists. Refresh the page and try again.",
  FK: "This record is linked to other data and cannot be changed this way.",
};

function classify(error: unknown): DbErrorCode {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "UNIQUE";
    if (error.code === "P2025") return "NOT_FOUND";
    if (error.code === "P2003") return "FK";
  }
  return "UNKNOWN";
}

export async function withDbErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof DbError) {
      throw error;
    }
    const code = classify(error);
    console.error(`[DB Error] ${errorMessage} (${code}):`, error);
    throw new DbError(code, code === "UNKNOWN" ? errorMessage : USER_MESSAGES[code]);
  }
}
