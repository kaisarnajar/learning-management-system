import { isRedirectError } from "next/dist/client/components/redirect-error";

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
    console.error(`[DB Error] ${errorMessage}:`, error);
    throw new Error(errorMessage);
  }
}
