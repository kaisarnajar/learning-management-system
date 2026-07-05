import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";

/**
 * Executes a server action block. If an error is thrown:
 * - If it's a Next.js redirect error (internal navigation mechanism), it is rethrown so Next.js handles it.
 * - Otherwise, it logs the error and redirects to the error route with the message URL-encoded.
 */
export async function executeServerAction<T>(
  action: () => Promise<T>,
  redirectPathOnError: string,
  logMessage: string = "Server Action error",
  errorParamName: string = "saveError"
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error(`[Server Action Error] ${logMessage}:`, error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    const separator = redirectPathOnError.includes("?") ? "&" : "?";
    redirect(`${redirectPathOnError}${separator}${errorParamName}=${encodeURIComponent(message)}`);
  }
}
