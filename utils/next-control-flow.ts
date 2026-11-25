import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getURLFromRedirectError } from "next/dist/client/components/redirect";
import {
  getAccessFallbackHTTPStatus,
  isHTTPAccessFallbackError,
} from "next/dist/client/components/http-access-fallback/http-access-fallback";

/**
 * The one place that reads Next.js's control-flow errors (redirect(),
 * notFound(), forbidden(), unauthorized()). Next.js exports no public API to
 * tell them apart, only `unstable_rethrow` from next/navigation to pass them
 * on, which is what a catch block that only needs to let them through should
 * use. Code that must know *which* one was thrown (the staff API turning a
 * server action's redirect into JSON) asks here, so a Next.js upgrade that
 * moves these internals breaks this file and its tests, nothing else.
 */

/** The control-flow signal [error] carries, or null when it is an ordinary error. */
export type NextControlFlow = { kind: "redirect"; url: string } | { kind: "http-status"; status: number };

export function nextControlFlowOf(error: unknown): NextControlFlow | null {
  if (isRedirectError(error)) return { kind: "redirect", url: getURLFromRedirectError(error) };
  if (isHTTPAccessFallbackError(error)) return { kind: "http-status", status: getAccessFallbackHTTPStatus(error) };
  return null;
}

/** True when [error] is the one redirect() throws. */
export function isNextRedirect(error: unknown): boolean {
  return isRedirectError(error);
}
