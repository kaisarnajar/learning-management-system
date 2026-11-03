import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { DbError } from "@/utils/db-error";
import { type FlashCode, withFlash } from "@/utils/flash";

/**
 * An error whose message was written for the user (a validation message, a
 * business rule such as "this course still has students"). Throw it inside a
 * server action to send that message back with the redirect; any other
 * exception is logged and reported as a generic failure.
 */
export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

const DB_CODE_TO_FLASH: Record<DbError["code"], FlashCode> = {
  UNIQUE: "duplicate",
  NOT_FOUND: "not_found",
  FK: "linked",
  UNKNOWN: "unexpected",
};

/**
 * Runs a server action. A Next.js redirect passes through. An ActionError
 * redirects with its message (`?msg=`); a DbError with the matching flash
 * code; anything else is logged and redirected as `?err=unexpected`, so
 * exception internals never appear in a URL.
 */
export async function executeServerAction<T>(
  action: () => Promise<T>,
  redirectPathOnError: string,
  logMessage: string = "Server Action error",
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof ActionError) {
      redirect(withFlash(redirectPathOnError, { message: error.message }));
    }
    if (error instanceof DbError) {
      console.error(`[Server Action Error] ${logMessage}:`, error.code, error.message);
      redirect(withFlash(redirectPathOnError, { code: DB_CODE_TO_FLASH[error.code] }));
    }
    console.error(`[Server Action Error] ${logMessage}:`, error);
    redirect(withFlash(redirectPathOnError, { code: "unexpected" }));
  }
}
